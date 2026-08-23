# Update 1 — Content additions, one reliability fix, two public values

This is an **incremental update** to the already-built, already-reviewed site. `CLAUDE.md` in this same folder is still fully valid — nothing in it is superseded. This file adds four specific changes on top of it.

Before starting: re-familiarize yourself with `CLAUDE.md` §3 (design tokens) and §7 (accessibility floor, incl. `prefers-reduced-motion`) — both apply directly to what follows.

## 1. New image carousel in "How it works" (§5.4 of CLAUDE.md)

Three new images already exist in `images/`: `product-work-1.jpg`, `product-work-2.jpg`, `product-work-3.jpg`. They are mechanism/illustration images (not real photography — same category as supplier-provided technical diagrams), meant to visually back up the section's existing technical claims.

**Position:** immediately after `<h2>كيف يعمل الجهاز؟</h2>`, before the existing `<p class="intro">`. Nothing else in this section moves.

**Behavior:** a horizontal swipeable carousel, not a vertical stack. `product-work-1` must be the image visible with zero scrolling; swiping reveals `-2` then `-3` in that order.

**Implementation guidance (not full-code — use your judgment on the exact markup, but the following constraints are not optional):**
- Pure CSS `scroll-snap` (`scroll-snap-type: x mandatory` on the container, `scroll-snap-align: start` on each image). No JS carousel library — stay consistent with the rest of this build.
- 🔴 **RTL correctness is not optional here and is not guaranteed by default.** Because `<html dir="rtl">`, a horizontal scroll container's "start" (where `product-work-1` must sit, unscrolled) is the **right** edge, not the left. This exact scenario has a documented history of cross-browser inconsistency. After building it, **actually test in a real browser** (not just visual inspection) that `product-work-1` is what's visible on load with zero scroll offset, and that swiping moves toward `-2` then `-3` — do not assume the native behavior is correct without checking.
- Let the next image "peek" slightly at the screen edge (e.g. each image taking ~85% of the container width) as a natural swipe affordance, rather than adding dot indicators — keeps in line with the page's restrained visual style.
- Same image treatment as everywhere else: convert to WebP, reasonable width for a mobile carousel slide, `loading="lazy"` (this section is well below the fold).
- Alt text (write your own precise wording, this is a reasonable starting point):
  - product-work-1: illustration of the device in use showing the internal mechanical motion
  - product-work-2: illustration of the movable metal massage heads
  - product-work-3: illustration of the internal mechanism and motor

## 2. Two copy corrections — exact text, exact locations

Both are **locked-content corrections from the project owner**, not your judgment calls — apply verbatim.

**a) Wearing guide, step 3** (§5.4, the `<ol class="wearing-guide">`, third `<li>`):
- Current: `اختار سرعة التدليك والعجن ومستوى الحرارة، واضغط زر التشغيل`
- Replace with: `اضغط زر التشغيل، واختار سرعة التدليك والعجن ومستوى الحرارة المناسبين لك`
- (Reason, for your context only, doesn't change the instruction: the speed/heat buttons are physically inert until the device is powered on — the old order was factually backwards.)

**b) Unboxing caption** (§5.6, `<p class="unboxing-caption">`):
- Current: `هادشي اللي غادي توصلك`
- Replace with: `هادشي اللي غادي يوصلك`
- Single-letter change only (ت→ي). Do not touch "اللي" or anything else in the sentence.

## 3. Reliability fix — replace native smooth-scroll with a manual implementation

In `js/main.js`, `scrollToNearestForm()` currently calls `nearest.section.scrollIntoView({ behavior: ..., block: 'start' })`. Native smooth-scroll support is inconsistent across mobile browsers and in-app webviews (Facebook/Instagram in particular — where most real traffic will arrive from). Replace it with a manual `requestAnimationFrame`-based scroll so behavior is identical on every device, while still fully respecting `prefers-reduced-motion` exactly as before (instant jump, no animation).

Add this function and update `scrollToNearestForm()` to use it:

```js
function smoothScrollTo(targetY, duration) {
  var startY = window.scrollY;
  var distance = targetY - startY;
  var startTime = null;

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    var elapsed = timestamp - startTime;
    var progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutQuad(progress));
    if (progress < 1) window.requestAnimationFrame(step);
  }

  window.requestAnimationFrame(step);
}
```

Inside `scrollToNearestForm()`, replace the final `nearest.section.scrollIntoView(...)` call with:

```js
var targetY = window.scrollY + nearest.section.getBoundingClientRect().top;
if (prefersReducedMotion()) {
  window.scrollTo(0, targetY);
} else {
  smoothScrollTo(targetY, 500);
}
```

Everything else in that function (finding the nearest section) stays as-is — only the final scroll call changes.

## 4. Two real, non-secret values to fill in now

These two are meant to be publicly visible in the page source — they are not secrets, so they go directly into the code:

- **WhatsApp number:** `212728110472` (this is the normalized form — no `+`, no spaces, no dashes). Use it in:
  - `tel:` link in the footer → `tel:+212728110472` (keep the `+` only here)
  - `wa.me` link in the footer → `https://wa.me/212728110472`
  - the floating WhatsApp bubble's `href` → `https://wa.me/212728110472?text=...` (keep the existing pre-filled message text and its URL-encoding exactly as-is, only replace the placeholder number)
- **Meta Pixel ID:** `1519689206596149` — replace `META_PIXEL_ID_PLACEHOLDER` in the `<head>` Pixel script (the `fbq('init', ...)` line) with this exact value.

## 5. What NOT to touch this round

Four more values exist (Meta CAPI access token, Telegram bot token, Telegram chat ID, Google Sheets web app URL) but **do not add them anywhere in the code**. They are genuine secrets and were deliberately designed from the start (`CLAUDE.md` §8.3) to be read from Cloudflare Pages environment variables at runtime (`env.META_CAPI_TOKEN` etc.) rather than living in source code. That part of the code is already correct and needs zero changes — the actual values get entered directly into Cloudflare's dashboard in a separate deployment step, never into a file, never into git.

## 6. Test, then commit and push

Re-test in a real browser exactly as before: the new carousel (including the RTL initial-position check above), the sticky-bar scroll-to-form behavior on a simulated reduced-motion setting and without it, and a full form submission cycle. Confirm the WhatsApp links and Pixel ID appear correctly in the rendered page.

Commit with a clear message describing this as an update (not a fresh build), and push to the same existing GitHub repository (`gh` is already authenticated from the first session).

Report back with: confirmation the RTL carousel behaves correctly, confirmation of the scroll-fix test, and the commit hash/link.
