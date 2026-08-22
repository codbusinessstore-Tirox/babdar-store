export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { name, phone, city, website, eventId } = body; // `website` = honeypot field

    // Honeypot: if a hidden field got filled, it's a bot. Pretend success, do nothing else.
    if (website) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const cleanPhone = (phone || '').replace(/\s/g, '');
    const phoneRegex = /^(06|07)[0-9]{8}$/;

    if (!name || name.trim().length < 2) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_name' }), { status: 400 });
    }
    if (!phoneRegex.test(cleanPhone)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_phone' }), { status: 400 });
    }
    if (!city || city.trim().length < 2) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_city' }), { status: 400 });
    }

    // Informational only — flags for the confirmation team, NEVER blocks a submission.
    // Rationale: a visitor arriving via facebook.com/ads/library is more likely doing
    // competitive research than buying; we still take the order, just flag it for extra
    // scrutiny before the confirmation call, because a false positive (blocking a real
    // customer) is worse than an occasional missed scout.
    const referrer = request.headers.get('Referer') || '';
    const isFromAdsLibrary = referrer.includes('facebook.com/ads/library');

    const clientIp = request.headers.get('CF-Connecting-IP') || '';
    const userAgent = request.headers.get('User-Agent') || '';
    const pageUrl = request.headers.get('Referer') || '';
    const finalEventId = eventId || crypto.randomUUID();

    const results = await Promise.allSettled([
      sendToSheets(env, { name, phone: cleanPhone, city, isFromAdsLibrary }),
      notifyTelegram(env, { name, phone: cleanPhone, city, isFromAdsLibrary }),
      sendToMetaCAPI(env, { eventId: finalEventId, phone: cleanPhone, clientIp, userAgent, pageUrl }),
    ]);

    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`submit-order integration ${i} failed:`, r.reason);
    });
    // Deliberately: integration failures never fail the customer's request. A Telegram
    // outage should not stop someone from placing an order.

    return new Response(JSON.stringify({ ok: true, eventId: finalEventId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('submit-order fatal error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), { status: 500 });
  }
}

async function sendToSheets(env, data) {
  if (!env.SHEETS_WEBHOOK_URL) return; // not wired up yet — safe no-op, don't throw
  await fetch(env.SHEETS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, timestamp: new Date().toISOString() }),
  });
}

async function notifyTelegram(env, data) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const flag = data.isFromAdsLibrary ? '\n⚠️ قد يكون من مصدر بحثي (مكتبة إعلانات) — تحقق بعناية' : '';
  const text = `🆕 طلبية جديدة\nالاسم: ${data.name}\nالهاتف: ${data.phone}\nالمدينة: ${data.city}${flag}`;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
  });
}

async function sendToMetaCAPI(env, data) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return;
  const hashedPhone = await sha256(normalizeMoroccanPhone(data.phone));
  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: data.eventId,
      action_source: 'website',
      event_source_url: data.pageUrl,
      user_data: {
        ph: [hashedPhone],
        client_ip_address: data.clientIp,
        client_user_agent: data.userAgent,
      },
      custom_data: { value: 249, currency: 'MAD' },
    }],
    access_token: env.META_CAPI_TOKEN,
  };
  // NOTE FOR HUMAN REVIEW: verify the current Graph API version at
  // developers.facebook.com/docs/graph-api/changelog before deploying — replace
  // the version below if it has been deprecated since this was written.
  const GRAPH_API_VERSION = 'v21.0';
  await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${env.META_PIXEL_ID}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function normalizeMoroccanPhone(phone) {
  // 0X XXXXXXXX -> 212XXXXXXXXX (Meta expects country code, no leading zero, no +)
  const digits = phone.replace(/\D/g, '');
  return '212' + digits.slice(1);
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
