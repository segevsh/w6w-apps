import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listWorkbooks from "../actions/list-workbooks.ts";

export default pollFromListAction({
  key: "new-workbook",
  title: "New Workbook",
  description: "The run gets each newly created workbook found in the drive.",
  action: listWorkbooks,
  input: () => ({ query: ".xlsx", xlsxOnly: true, orderby: "createdDateTime desc", top: 100 }),
  items: (result) => (result as { value?: unknown[] }).value ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Workbook ID" }],
  sample: { id: "workbook-new", name: "New workbook.xlsx" },
  maxPages: 1,
});
