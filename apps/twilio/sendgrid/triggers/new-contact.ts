import contactGetAll from "../actions/contact-get-all.ts";
import { sgqlTime, sinceTrigger, stampMs } from "../lib/triggers.ts";

/**
 * `POST /v3/marketing/contacts/search` through `contact-get-all` with the SGQL query
 * `created_at >= TIMESTAMP '<since>'`. `created_at` is a documented contact field and SGQL's
 * `TIMESTAMP '…'` literal is documented at
 * https://www.twilio.com/docs/sendgrid/for-developers/sending-email/segmentation-query-language.
 * Search results are unordered, so the window is deduped by contact id.
 */
export default sinceTrigger({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created Marketing Campaigns contact.",
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "sample-contact-id",
    email: "contact@example.test",
    created_at: "2026-11-09T00:01:00Z",
    updated_at: "2026-11-09T00:01:00Z",
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  createdMs: (item) => stampMs((item as { created_at?: unknown }).created_at),
  async fetchPage(since, _page, ctx) {
    const out = await contactGetAll.execute({
      returnAll: true,
      limit: 100,
      query: `created_at >= TIMESTAMP '${sgqlTime(since)}'`,
    }, ctx);
    return { items: Array.isArray(out) ? out : [] };
  },
});
