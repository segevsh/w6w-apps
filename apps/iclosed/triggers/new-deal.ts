import { pollFromListAction } from "../../_shared/poll/mod.ts";
import dealList from "../actions/deal-list.ts";

export default pollFromListAction({
  key: "new-deal",
  title: "New Deal",
  description: "Fires when iClosed records a new deal.",
  action: dealList,
  input: () => ({ limit: 100, page: 0, orderBy: "desc", orderColumn: "time" }),
  items: (result) => ((result as { data?: { deals?: unknown[] } }).data?.deals ?? []),
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Deal ID" }],
  sample: { id: "deal_123" },
});
