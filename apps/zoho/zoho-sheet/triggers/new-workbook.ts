import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/workbook-list.ts";

export default pollFromListAction({
  key: "new-workbook",
  title: "New Workbook",
  description: "Polls the existing workbook-list action sorted by recently created workbooks.",
  action,
  input: () => ({ startIndex: 1, count: 100, sortOption: "recently_created" }),
  items: (result) => (result as { workbooks?: unknown[] }).workbooks ?? [],
  idOf: (item) =>
    String(
      (item as { resource_id?: unknown; id?: unknown }).resource_id ??
        (item as { id?: unknown }).id ?? "",
    ),
  output: [{ key: "resource_id", type: "string", label: "Workbook ID" }],
  sample: { resource_id: "workbook-101" },
});
