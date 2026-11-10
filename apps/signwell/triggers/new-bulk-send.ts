import { pollFromListAction } from "../../_shared/poll/mod.ts";
import bulkSendList from "../actions/bulk-send-list.ts";

export default pollFromListAction({
  key: "new-bulk-send",
  title: "New Bulk Send",
  description: "The run gets each newly created bulk send.",
  action: bulkSendList,
  input: () => ({ page: 1, limit: 50 }),
  items: (result) => (result as { bulk_sends?: unknown[] }).bulk_sends ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Bulk send ID" }],
  sample: { id: "bulk-send-101" },
  maxPages: 1,
});
