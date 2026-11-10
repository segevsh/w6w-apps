import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/sms-notification-list.ts";

/** OnceHub list endpoints return objects in reverse chronological order (pagination guide). */
export default pollFromListAction({
  key: "new-sms-notification",
  title: "New SMS Notification",
  description: "The run gets each SMS notification OnceHub sends from the account.",
  action,
  input: () => ({ limit: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Notification ID" },
    { key: "type", type: "string", label: "Type (sms)" },
    { key: "status", type: "string", label: "Delivery status" },
    { key: "creation_time", type: "string", label: "Created at" },
    { key: "recipient", type: "string", label: "Recipient ID" },
    { key: "recipient_type", type: "string", label: "contact or user" },
  ],
  sample: {
    object: "notification",
    id: "SMS-8X92M293",
    type: "sms",
    status: "delivered",
    creation_time: "2026-11-09T14:30:00Z",
    recipient: "CTC-555444333",
    recipient_type: "contact",
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
