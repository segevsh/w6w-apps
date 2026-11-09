import { pollFromListAction } from "../../_shared/poll/mod.ts";
import smsList from "../actions/sms-list.ts";

export default pollFromListAction({
  key: "new-sms",
  title: "New SMS",
  description: "Fires when a new SMS message appears in Kudosity history.",
  action: smsList,
  input: () => ({ limit: 100, page: 1, newestFirst: true }),
  items: (result) => (result as { smses?: unknown[] }).smses ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "SMS ID" }],
  sample: { id: "sms_123" },
});
