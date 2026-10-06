# VBOUT

Marketing automation (email, contacts, social, goals) driven through the VBOUT REST API
(`https://api.vbout.com/1`). 26 actions centred on the email-marketing surface.

Every path, verb, parameter and enum was verified on 2026-10-06 against the OpenAPI 3.1 document at
`developers.vbout.com/scripts/openapi.json` (71 paths), the Quickstart page and the vendor's cURL
samples, plus unauthenticated probes of the host. The OpenAPI document is low quality (no security
scheme, paths without a leading slash, every HTTP status listed, parameter names with stray
spaces), so nothing was taken from it alone.

## Auth

One method, **API Key**: the `key` query parameter (the vendor's samples are all
`…/<action>.json?key={YOUR_API_ID}`). A User Key has full access; an Application Key has limited
access. It is stamped by `sign` only; no action touches it.

The connection check is `GET /1/app/me.json`, which returns only business details (never the key).
The verdict is read from the body: `header.status: "ok"` plus `data.business` passes; an error
envelope fails.

## Things that differ from what you would guess

- **Every answer is an envelope**, `{"response": {"header": {"status": "ok"|"error"}, "data": …}}`.
  The verdict is `header.status`, not the HTTP status. An unauthenticated call is `401` with
  `errorCode 1000`; the Quickstart's bad-key sample is `errorCode 1002`.
- **Write parameters go in a form body**, not the query string, as the vendor's samples show
  (`email=… status=… listid=… fields[125]=John`), though the OpenAPI document lists them as query.
  Custom fields flatten to `fields[<fieldId>]=<value>`.
- **Deletes are sent as POST.** The OpenAPI document says `DELETE`, but the vendor's own cURL sample
  for every delete operation is `POST …/delete….json`. This could not be confirmed against a live
  key; if VBOUT rejects it, the verb is the one line to change in `lib/client.ts` callers.
- **Contact status** is `active` or `disactive` (the vendor's spelling).
- **Rate limit**: 15 requests per second, answered with `429`.

## Health

- `service` — declared unavailable (informational). `developers.vbout.com/apistatus` is an empty
  page; no status page or feed was found.
- `api` — unauthenticated `GET /1/app/me.json`; any JSON in the documented envelope passes, even
  an auth error. An HTML page or a 5xx is down.
- `quota` — declared unavailable (informational). Only a per-second burst limit is documented.
- `auth:api-key` — derived from the Auth `test` hook.

## Not covered

Left out because the shape could not be confirmed or the surface is not core automation: social
post add/edit/delete/get/calendar, email campaign add/edit/delete (HTML bodies and audience
targeting), contact lookup by phone number and the by-email timeline (the sample reuses
`id=3`, so the real parameter is unclear), coupons, user/group management, goal add/edit/delete,
the `Webhook/*` family (despite its name it manages on-site prompts, not event webhooks), custom
shortcodes, sub-account creation/auto-login, automation and pipeline guides, and AI chatbot
templates. The campaign list omits `from`/`to`: the vendor documents them as working only with a
`date` filter that is not among the listed filter values.

## Icon

`assets/icon.svg` embeds, unmodified, the PNG favicon VBOUT publishes at
`vbout.com/wp-content/uploads/2019/04/Favicon-Cerulean-20KTop-400x400.png` (58,374 bytes, 400x400);
the site has no SVG mark at `/favicon.svg` (404).
