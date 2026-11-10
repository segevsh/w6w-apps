import { pollFromListAction } from "../../_shared/poll/mod.ts";
import smsHistoryList from "../actions/sms-history-list.ts";

export default pollFromListAction<Record<string, unknown>>({
  key: "new-sms",
  title: "New SMS",
  description: "Emit newly recorded SMS messages from ClickSend history.",
  action: smsHistoryList,
  params: smsHistoryList.params,
  input: (params) => ({ ...params, orderBy: "date:desc", page: 1, limit: 100 }),
  items: (result) => (result as { rows?: unknown[] }).rows ?? [],
  idOf: (item) => String((item as { message_id: unknown }).message_id),
  output: [{ key: "message_id", type: "string", label: "Message ID" }],
  sample: { message_id: "sms_1" },
});
