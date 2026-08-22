# Bab Dar Store — Landing Page for P008 (Neck/Shoulder Massager)

You are building a **single, self-contained, static landing page** for a Cash-on-Delivery (COD) e-commerce product in Morocco. This file is fully self-sufficient — everything you need is here. Do not invent content that isn't specified; where content is fixed, reproduce it exactly.

## 0. Roles — read this first

Two kinds of instructions appear below, and they carry different weight:

- **LOCKED CONTENT** (all customer-facing copy, section order, the specific psychological rules in §4, hard constraints in §12): these come from a Moroccan CRO/UX specification approved by the business owner after four rounds of review. Reproduce this **exactly** — do not paraphrase, "improve," translate, or reorder it. If you think something is wrong, leave a `<!-- NOTE: ... -->` HTML comment explaining your concern instead of changing it.
- **YOUR CALL** (framework choice, file structure, exact CSS approach, JS patterns, image optimization tooling): make sensible, professional decisions. Where this doc gives example code, treat it as close to final for the parts marked "exact," and as a strong starting pattern (feel free to clean up) for everything else.

## 1. Stack & constraints

- **No framework.** Plain semantic HTML5 + one CSS file + one JS file. This is a single page; a build tool adds risk and complexity for zero benefit here.
- **Deployment target:** Cloudflare Pages. Static root deploys with zero build config. Server logic goes in `/functions/api/*.js` using Cloudflare Pages Functions' file-based routing (`onRequestPost` export).
- **Mobile-first, RTL, Arabic.** `<html lang="ar" dir="rtl">`. Design for a ~360–420px viewport first; center content on wider screens (see §3.5). No separate desktop layout is needed.
- **Performance budget:** total initial page weight (HTML+CSS+JS+critical images) under ~700KB. This audience is frequently on 3G/4G, not fiber. Concretely:
  - Self-host the Arabic font (Tajawal), subset if practical, `font-display: swap`.
  - All images below the fold: `loading="lazy"`.
  - Convert all photos to WebP (quality ~78–82), reasonable max dimensions (see §9). Use a one-time local script (e.g. `sharp` via `npx`) to batch-process the source images — this tooling does not need to ship with the site.
  - No animation/JS libraries. No web fonts beyond the one Arabic family. No render-blocking third-party scripts except the Meta Pixel (async).
- **Accessibility floor (not in the source spec, add it anyway):** visible keyboard focus states on all interactive elements, `prefers-reduced-motion` respected for the sticky-bar fade and any transitions, all images have meaningful `alt` text, form errors are associated with their fields (`aria-describedby`), all icons are `aria-hidden` with the adjacent text carrying the meaning.
- **CSS care:** avoid selector-specificity fights, especially between a section-level class and a component-level class controlling the same margin/padding property (e.g. `.section` vs `.cta`) — a very easy trap in vertically-stacked one-column layouts like this one. Keep spacing rules co-located and predictable.
- **No `localStorage`/`sessionStorage`** for form-sync state (see §7) — use a simple shared JS module/state object, since both form instances live on the same page load.

## 2. File structure

```
babdar-store/
├── CLAUDE.md
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── images/
│   ├── hero.jpg              (or .mp4 — see §9)
│   ├── unboxing-1-closed.webp
│   ├── unboxing-2-inside.webp
│   ├── unboxing-3-removed.webp
│   ├── unboxing-4-full.webp
│   ├── review-1.webp
│   ├── review-2.webp
│   ├── review-3.webp
│   └── review-4.webp
├── functions/
│   └── api/
│       └── submit-order.js
└── .gitignore
```

## 3. Design tokens — exact, non-negotiable

```css
:root {
  --color-bg: #FAF6F0;        /* warm cream — never pure white */
  --color-text: #2B2420;      /* warm navy-brown — never pure black */
  --color-cta: #C1502E;       /* burnt orange/terracotta — the order button */
  --color-cta-text: #FFFFFF;
  --color-panel: #EDE3D3;     /* value box / guarantee box background */
  --color-price-old: #5F5E5A; /* struck-through price — deliberately muted */
  --color-border: #DCD3C4;

  --font-arabic: 'Tajawal', sans-serif;

  --space-card-pad: 16px;
  --space-card-gap: 12px;
  --space-section-gap: 40px;
  --space-page-margin: 16px;
  --radius-card: 12px;
  --radius-control: 8px;

  --max-width: 480px;
}
```

**Absolutely forbidden, no exceptions:** any blue tone near the CTA or anywhere that could echo Visa/Mastercard branding; any loud gradient; neon/phosphorescent colors; any Visa/Mastercard-style card icon anywhere on the page.

**Type scale:**
| Element | Size | Weight |
|---|---|---|
| H1 (hero only) | 28–30px | bold |
| H2 (section headings) | 22–24px | bold |
| Body | 16–17px | regular |
| Small/reassurance text | 13px minimum | regular |
| Current price | 36px | bold |
| Struck-through price | 18px | regular |

All numbers, prices, and phone numbers use Western digits (0–9), never Eastern Arabic numerals.

Icons: SVG only, single color per icon (either `--color-cta` or `--color-text`). No multi-color/cartoon-style icons. **Every emoji in this document (✅ 🚚 📦 🔄 💬) is conceptual shorthand for you to translate into a single-color SVG icon — never render an actual emoji character on the page.**

Layout: single column for the entire page. Max content width `480px`, horizontally centered, neutral background filling any side space on wider viewports. No responsive breakpoints beyond this centering — this is intentionally not a "responsive design," it's a mobile design that happens to be viewable on wider screens.

## 4. Persistent elements (not scroll-bound)

**Header:** ~48px bar, background = page background, no visible bottom border. Contains only the store name **"Bab Dar Store"**, 18px medium weight, no nav links of any kind. Its only job is silent reassurance ("this is a real store with a name").

**Sticky CTA bar:** appears after the visitor scrolls past the Above-the-Fold section (~600–700px), fade+slide-up transition (~200ms, skip if `prefers-reduced-motion`). One row, ~60px tall: price "249 د.م" on one side, a compact "اطلب الآن" button (CTA color) on the other. Tapping it smooth-scrolls to the *nearest* order form (see §7).

**Floating WhatsApp bubble:** circular, ~52px, floats directly above the sticky bar (no visual overlap), bottom-right corner (mirror for RTL as appropriate — bottom-right visually as the user sees it). Links to `https://wa.me/<NUMBER>?text=` + URL-encoded **"سلام، بغيت نعرف كثر على جهاز التدليك"**. Leave `<NUMBER>` as a clearly marked placeholder (e.g. `WHATSAPP_NUMBER_PLACEHOLDER`) — the owner will supply the real number later.

**Footer:** below the final order form. Background `--color-panel`. Centered: store name "Bab Dar Store", and a phone number as both a `tel:` and a `wa.me` clickable link (same placeholder number). **Do not fabricate "Privacy Policy" or "Terms" links** — none exist yet, and a dead/fake link is worse than no link.

## 5. Page copy & structure, in scroll order

Everything in quotes below is **exact, locked Moroccan Darija copy** (except §5.5 which is deliberately Modern Standard Arabic — see the note there). Reproduce it character-for-character.

### 5.1 Above the Fold

**H1:**
> راحة حقيقية لظهرك، رقبتك وكتافك... فالدار، دابا، بضغطة زر

**Subheading:**
> جهاز مساج كيلتف حول رقبتك وكتافك، بأربع رؤوس كتعجن وتدلك بحال يدين حقيقيين — بلا ما تحتاج تحجز موعد عند خبير التدليك.

**Media:** see §9 (`hero`). This is the single most important visual on the page.

**Primary CTA button** (two lines): line 1 bold/larger **"اطلب الآن"**, line 2 smaller **"الدفع عند الاستلام"**. Color `--color-cta`. Never use the word "شراء" (purchase) anywhere near this button — it's deliberately avoided to sidestep any bank-card association. Tapping it smooth-scrolls to the early order form (§5.2).

**Reassurance line under the button:**
> قلب السلعة وتأكد، والدفع عند الاستلام.

### 5.2 Early order form

Positioned immediately after Above the Fold, before any other section. Identical fields, validation, and button text to the final form (§5.8/§11) — see §7 for the synchronization requirement between the two instances.

### 5.3 Problem & Benefit

Three cards, single column, each: SVG icon on top, bold title, one–two lines of body text below. After the three cards: a **value box** (different background, `--color-panel`) then the **price display** as a fully separate element.

**Section heading:**
> هاد الحريق حتى لفوقاش غادي يبقى معاك؟

**Card 1 — direct pain:**
- Title: **الراحة كتجيك لعندك، بلا ما تسنى**
- Body: الحريق فالظهر والرقبة والكتفين اللي كيجيك من الوقوف الطويل أو الخدمة أو الجلوس فالمكتب — مخاصوش يبقى شي حاجة كتعيش معاها كل نهار بصمت. الجهاز كيعطيك نفس الإحساس ديال جلسة مساج حقيقية، فأي وقت بغيتي.

**Card 2 — family independence:**
- Title: **بلا ما تطلب من حتى واحد**
- Body: كاين شي مرات لي كتطلب من ولادك يديرو ليك المساج، وكتحس بشوية ديال التردد قبل ما يجاوبوك. دابا ممحتاج تطلب من حتى واحد. الجهاز عندك خدمو فوقما بغيتي.

**Card 3 — family ownership (no technical detail here on purpose):**
- Title: **جهاز ديال الدار كاملة**
- Body: خفيف وسهل الاستعمال، محايد بين الجميع — ماشي غير ليك، بل لأي واحد فالدار حس بنفس الحريق. جبتي حاجة كتنفع الكل، ماشي غير راحة شخصية.

**Value box (Anchoring):**
> 💬 جلسة وحدة عند المختص كتكلف تقريباً بحالو، وهاد الجهاز كيخدم معاك كل نهار بلا حدود — وهو جهاز ديال الدار كاملة، كيستافد منه أي واحد فالعائلة.

**Price display** — a self-contained element, centered, **no heading or surrounding text of any kind, just two numbers**:
- Struck-through: "349 د.م", 18px, `--color-price-old`
- 4px below it: "249 د.م", 36px bold, `--color-text`

Do not add "original price," "market value," or any framing words around these two numbers. This is deliberate — see the locked-constant list in §12.

### 5.4 How it works — Modern Standard Arabic (the one exception)

The rest of the page is Darija; **this section is deliberately written in Modern Standard Arabic (فصحى)** — the formal register signals technical seriousness and directly counters an anticipated "is this a toy or a real device" objection.

**Heading:**
> كيف يعمل الجهاز؟

**Intro line:**
> الجهاز يلتف حول الرقبة والكتفين، ويحتوي جزؤه الأمامي على أربعة رؤوس تدليك وعجن بارزة تلامس الجلد مباشرة.

**Bulleted technical points (as separate list items with real spacing, never a dense paragraph — scannability is the point):**
- ضغط ميكانيكي حقيقي، لا اهتزاز سطحي خفيف
- ثلاثة مستويات لسرعة التدليك والعجن — بطيئة، متوسطة، سريعة
- مستويان للحرارة الخفيفة، مع مؤشر ضوئي أحمر
- زر لعكس اتجاه الدوران — مع عقارب الساعة أو عكسها
- شدة الضغط تُتحكَّم بيدك عبر شد الحزامين، حسب الراحة اللي بغيتيها
- حزام إضافي بمشبك، لتثبيت الجهاز بإحكام خصوصاً عند استعماله في أسفل الرقبة

**Wearing guide, 3 numbered steps, each with an icon + exactly one line:**
1. حط الجهاز فوق ظهرك أو رقبتك، بالطريقة اللي تريحك
2. شد الحزامين للضغط اللي بغيتي
3. اختار سرعة التدليك والعجن ومستوى الحرارة، واضغط زر التشغيل

### 5.5 Social proof

**Heading:**
> كلمة صريحة

3–4 cards, each showing a **real WhatsApp screenshot** (real testimonial images already supplied — see §9 `review-1..4`). Card style: white/cream background, thin 0.5px border, screenshot neatly framed inside (not a raw unstyled image dump), sized for comfortable mobile reading without pinch-zoom. **Do not add star ratings, "verified buyer" badges, or any fabricated review copy** — the screenshots are the entire content of this section.

### 5.6 Product details — real unboxing sequence

**Do not use a single flat-lay image here.** Four real, sequential, **completely unedited** photos (no noise reduction, no color correction, no cosmetic cropping — see §9) tell the unboxing story. Stack them **vertically, full-width, one per row** — not a thumbnail grid. Fine detail (bag texture, button layout, lining color) needs real screen space to read clearly on mobile.

**Caption above the sequence:**
> هادشي اللي غادي توصلك

Order (see §9 for exact filenames):
1. Box closed
2. Box open, product still in its clear bag, inside the box
3. Product removed from the box (still bagged), next to the open box showing the cable and manual
4. Full flat-lay: device out of its bag, box + cable + manual (open to the wearing-diagram page, not the cover) arranged together

**Features list** (bullet points, same scannable style as §5.4):
- أربعة رؤوس تدليك وعجن بارزة، تلامس الجلد مباشرة بضغط ميكانيكي حقيقي
- ثلاثة مستويات لسرعة التدليك والعجن
- مستويان للحرارة الخفيفة + مؤشر ضوئي أحمر
- زر لعكس اتجاه الدوران
- حزام بمشبك لتثبيت الجهاز بإحكام (جزء متكامل من الجهاز، لا قطعة منفصلة)
- شحن عبر كابل USB

**Box contents line:** الجهاز (بحزامه المدمج)، كابل الشحن، كتيّب الاستعمال.

**Never mention:** exact weight/dimensions, battery life duration (no confirmed number), any durability/quality promise, any reference to Chinese origin, any medical/diagnostic term.

### 5.7 Guarantee box

Background `--color-panel`, simple SVG shield icon above.

> ### ضمان الاستبدال
> إلا وصلك الجهاز فيه عيب أو خلل، كنبدلوه ليك — بلا ما تخلص زيادة.

### 5.8 Final order form + post-submit

Same fields/behavior as §5.2 (see §7). Button text identical to §5.1's CTA. Reassurance line beneath the button:
> تفتح الطرد، تأكد وقلب سلعتك، ومورها خلص.

Three small icons in a row below that, each with a short line beneath it:
> 🚚 توصيل لباب الدار · 📦 قلب السلعة وتأكد · 🔄 ضمان الاستبدال

**Post-submission message (replaces the form on success):**
> ## توصل طلبك ✅
> غادي نتصلو بيك من عندنا فأقرب وقت باش نأكدو تفاصيل التوصيل. تأكد راه الهاتف ديالك متاح، وحضّر نفسك تفتح الطرد وتتأكد قبل ما تخلص.

## 6. Locked constants — apply everywhere on the page, no exceptions

- No fake countdown timer or any false urgency indicator, anywhere.
- No Visa/Mastercard-style icon, anywhere.
- No price for this product other than **249 د.م**, in any context, ever.
- No medical or therapeutic claim, in any phrasing, anywhere. This is the single most important content rule on the entire page — violating it is a real business risk (fresh, fragile ad account; Meta ad policy scrutiny on health-adjacent products).
- No durability promise ("built to last," "European quality," etc.).
- No reference to Chinese origin.
- No text surrounding the struck-through/current price pair (§5.3) beyond the two numbers themselves.

## 7. Order form — fields, validation, sync

Both form instances (§5.2 and §5.8) share **identical fields, validation, and state**:

| Field | Type | Placeholder | Validation |
|---|---|---|---|
| Full name | text | اكتب اسمك الكامل | non-empty |
| Phone | tel/numeric | 06 أو 07 XX XX XX XX | must start with 06 or 07, exactly 10 digits total |
| City | text input with free-form autocomplete | اكتب مدينتك | non-empty — **do not restrict to a fixed city list**; this is deliberate, the owner wants geographic-targeting flexibility later without a code change |

Do not add an email field. Do not put an example name in the phone/name placeholders (a visible example name distracts while typing). The phone placeholder deliberately shows **both** `06` and `07` prefixes together — showing only one could imply the other isn't accepted.

**Inline errors**, shown directly under the field in a calm red on invalid submit attempt, cleared the instant the field becomes valid:
- Phone: **"تأكد من رقم الهاتف — يبدأ بـ06 أو 07 ويتكوّن من 10 أرقام"**
- Name or city empty: **"هاد الخانة خاصها تعمر"**

**City input:** a native `<input list="cities"> + <datalist>` is a reasonable lightweight default, but `<datalist>` rendering is inconsistent across Android browsers — if you judge a small custom combobox gives a better experience, build one. Your call.

**🔴 Critical sync requirement:** a successful submission from *either* form instance must immediately hide/disable *both* instances. Without this, a visitor could fill the early form, submit, then still see the late form empty and submit again — recording two orders for one customer. Use a single shared JS module/state (a simple pub-sub or shared object both form components read/write) — no `localStorage` needed since this is all one page load.

On successful submit: **only after the server confirms success** (see §8), swap the form(s) out for the post-submit message (§5.8) and fire the Pixel `Lead` event (§8.1). Do not fire the tracking event on button click before validation/server confirmation — that pollutes the data with failed attempts.

## 8. Tracking — exact implementation, this part is not "your call"

This code touches the business's ad-optimization data and financial math directly. Implement it as specified.

### 8.1 Meta Pixel (client-side, direct in `<head>`, no GTM — single page, GTM's overhead isn't worth it here)

```html
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'META_PIXEL_ID_PLACEHOLDER');
fbq('track', 'PageView');
</script>
```

Leave `META_PIXEL_ID_PLACEHOLDER` as a clearly marked placeholder — the real ID is created in the deployment phase (a Meta Business Manager account is needed, which is not this repo's concern).

### 8.2 Lead event on confirmed success

Generate one `eventId` per submission attempt (used for Pixel/CAPI deduplication — Meta's documented pattern for using both together):

```js
const eventId = crypto.randomUUID();
fbq('track', 'Lead', { value: 249, currency: 'MAD' }, { eventID: eventId });
```

Send this **same** `eventId` string to the server in the order-submission POST body (see §9 below) so the server-side CAPI call can carry it too.

### 8.3 Server-side Conversions API — `functions/api/submit-order.js`

Full implementation:

```js
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
```

**Do not implement rate-limiting or CAPTCHA/Turnstile inside this function.** Rate limiting will be configured as a Cloudflare dashboard rule on the `/api/submit-order` path (zero code), and Turnstile will be wired in during the deployment phase once its site key exists. Leave a clear `<!-- TODO: Turnstile token verification goes here once site key is issued -->` comment in the form-submit JS so it's easy to find later, but the form must work correctly without it for now.

**Environment variables this function expects** (all optional/safe-no-op if missing, so the site works before they're configured): `SHEETS_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `META_PIXEL_ID`, `META_CAPI_TOKEN`.

## 9. Image manifest — exact files, exact placement

All source images live in `images/` (already provided, see the folder the human will hand you). Optimize per §1 (WebP, reasonable max width, `loading="lazy"` below the fold) — the `hero` image only should stay unlazy-loaded (`loading="eager"` or omit the attribute) since it's the first thing rendered.

| Filename | Section | Notes |
|---|---|---|
| `hero.jpg` (or `.mp4` if provided as video — detect the actual extension in the folder and use a `<video autoplay muted loop playsinline>` instead of `<img>` if so) | §5.1 Above the Fold | The single most important image on the page. Real max-width ~800px is plenty for a mobile hero — don't over-serve resolution. |
| `unboxing-1-closed.webp` | §5.6, step 1 | Box closed |
| `unboxing-2-inside.webp` | §5.6, step 2 | Box open, product still bagged, inside |
| `unboxing-3-removed.webp` | §5.6, step 3 | Product removed (still bagged), next to open box |
| `unboxing-4-full.webp` | §5.6, step 4 | Full flat-lay of everything |
| `review-1.webp` through `review-4.webp` | §5.5 | Real WhatsApp screenshot testimonials — display as-is, do not crop out or alter any visible content |

**Do not apply any color correction, noise reduction, or cosmetic edits to the four `unboxing-*` or four `review-*` images** — format conversion and resizing only. These are meant to read as unedited proof of exactly what ships; any visible retouching undermines the entire point of this section.

## 10. Git & handoff

At the end of your work:

1. `git init` (if not already a repo), add a `.gitignore` (at minimum: `node_modules/`, `.DS_Store`).
2. Commit everything.
3. Create the GitHub repository and push using the GitHub CLI (`gh`), which the human has already authenticated:
   ```
   gh repo create babdar-store --private --source=. --remote=origin --push
   ```
   If that repo name is taken, try `babdar-store-site` or ask the human before choosing something else.
4. Report back to the human with: a short summary of what was built, the GitHub repo URL, any `<!-- NOTE -->` comments you left in the code and why, and an explicit list of the placeholders that still need real values (`WHATSAPP_NUMBER_PLACEHOLDER`, `META_PIXEL_ID_PLACEHOLDER`, and the five environment variables in §8.3) — these are deliberately out of scope for this pass and will be filled in during deployment.

Do not attempt to deploy to Cloudflare Pages yourself — that happens in a separate step with the human.
