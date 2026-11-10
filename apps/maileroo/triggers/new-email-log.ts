import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/search-email-logs.ts";

// `sort_dir` is "-1 newest first (default)" and an unset filter set is a plain account-wide search
// (https://maileroo.com/docs/api-reference/logs/search). Each entry is one message, keyed by its
// message_id, with the delivery events recorded so far.
export default pollFromListAction({
  key: "new-email-log",
  title: "New Email Log Entry",
  description:
    "The run gets each message newly logged by Maileroo (sent through the account), with its delivery events so far.",
  action,
  input: () => ({ page: 1 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { message_id?: unknown }).message_id),
  output: [
    { key: "message_id", type: "string", label: "Message ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "sender", type: "string", label: "Sender" },
    { key: "recipients", type: "array", label: "Recipients" },
    { key: "events", type: "array", label: "Delivery events so far" },
    { key: "datetime", type: "string", label: "Logged at" },
  ],
  sample: {
    message_id: "<message-1@example.com>",
    subject: "Welcome",
    sender: "sender@example.com",
    recipients: ["recipient@example.com"],
    events: [{ event_type: "delivered", timestamp: 1751000000, message: "250 OK", data: {} }],
    datetime: "2026-11-10T10:00:00Z",
  },
  maxPages: 1,
});
