import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/sms-notification-list.ts";

export default pollFromListAction({
  key: "new-sms-notification",
  title: "New SMS Notification",
  description: "The run gets each newly sent SMS notification.",
  action,
  input: () => ({ limit: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Notification ID" }],
  sample: { id: "sms-1" },
  minIntervalMs: 300_000,
  maxPages: 1,
});
