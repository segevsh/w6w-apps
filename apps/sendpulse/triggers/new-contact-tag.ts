import contactTagsList from "../actions/contact-tags-list.ts";
import { dataOf, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c). `GET /crm/v1/contact-tags` is unpaged: the whole tag list comes back
 * in one request (https://api.sendpulse.com/.well-known/openapi/crm.yaml, `/contact-tags`).
 */
export default snapshotTrigger({
  key: "new-contact-tag",
  title: "New Contact Tag",
  description: "The run gets each contact tag newly created in the CRM.",
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 301, name: "VIP" },
  rows: async (_p, ctx) => dataOf(await contactTagsList.execute({}, ctx)),
  idOf: (r) => String(r.id),
});
