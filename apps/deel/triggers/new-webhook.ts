import { snapshotList } from "../lib/snapshot.ts";
import { DeelClient } from "../lib/client.ts";

export default snapshotList({
  key: "new-webhook",
  title: "New Webhook",
  description: "The run gets each newly registered webhook.",
  // Vendor pager: query `cursor` (the list action sends `after_cursor`).
  list: (_p, ctx) => new DeelClient(ctx).requestAllNamedCursor("/webhooks"),
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "URL" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "w1", url: "https://example.com/hook", status: "enabled" },
});
