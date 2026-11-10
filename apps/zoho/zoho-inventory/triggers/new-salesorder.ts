import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/salesorder-list.ts";

export default pollFromListAction({
  key: "new-salesorder",
  title: "New Sales Order",
  description: "Polls the existing salesorder-list action.",
  action,
  input: () => ({ page: 1, per_page: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    String(
      (item as { salesorder_id?: unknown; id?: unknown }).salesorder_id ??
        (item as { id?: unknown }).id ?? "",
    ),
  output: [{ key: "salesorder_id", type: "string", label: "Sales order ID" }],
  sample: { salesorder_id: "salesorder-101" },
});
