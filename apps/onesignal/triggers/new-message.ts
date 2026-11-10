import { pollFromListAction } from "../../_shared/poll/mod.ts";
import viewMessages from "../actions/view-messages.ts";

/**
 * Wraps the existing `view-messages` action (`GET /notifications`). OneSignal documents the order:
 * "Results are sorted by queued_at in descending order" (offset parameter of
 * https://documentation.onesignal.com/reference/view-messages), so page 1 is newest-first.
 */
export default pollFromListAction({
  key: "new-message",
  title: "New Message",
  description: "The run gets each newly queued OneSignal message (push, email or SMS).",
  action: viewMessages,
  input: () => ({ limit: 50, offset: 0 }),
  items: (result) => (result as { notifications?: unknown[] }).notifications ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "queued_at", type: "number", label: "Queued at (Unix seconds)" },
  ],
  sample: { id: "b3b8c0a2-6c56-4e1e-9b3f-6c8e6a5e6b1e", name: "Welcome", queued_at: 1762732800 },
  maxPages: 1,
});
