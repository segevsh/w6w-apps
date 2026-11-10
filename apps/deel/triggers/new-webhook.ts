import { snapshotList } from "../lib/snapshot.ts";
import webhookList from "../actions/webhook-list.ts";

export default snapshotList({
  key: "new-webhook",
  title: "New Webhook",
  description: "The run gets each newly registered webhook.",
  action: webhookList,
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "URL" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "w1", url: "https://example.com/hook", status: "enabled" },
});
