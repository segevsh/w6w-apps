import contactGetAll from "../actions/contact-get-all.ts";
import { sgqlTime, sinceTrigger, stampMs } from "../lib/triggers.ts";

/**
 * Same documented SGQL search as `new-contact`, filtered on the documented `updated_at` contact
 * field. The event identity is `id:updated_at`, so an edit is a new event.
 */
export default sinceTrigger({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each Marketing Campaigns contact that is created or edited.",
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "sample-contact-id",
    email: "contact@example.test",
    created_at: "2026-11-09T00:01:00Z",
    updated_at: "2026-11-09T00:02:00Z",
  },
  idOf: (item) => {
    const c = item as { id?: unknown; updated_at?: unknown };
    return `${String(c.id ?? "")}:${String(c.updated_at ?? "")}`;
  },
  createdMs: (item) => stampMs((item as { updated_at?: unknown }).updated_at),
  async fetchPage(since, _page, ctx) {
    const out = await contactGetAll.execute({
      returnAll: true,
      limit: 100,
      query: `updated_at >= TIMESTAMP '${sgqlTime(since)}'`,
    }, ctx);
    return { items: Array.isArray(out) ? out : [] };
  },
});
