import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listWorkbooks from "../actions/list-workbooks.ts";

export default pollFromListAction({
  key: "new-or-updated-workbook",
  title: "New or Updated Workbook",
  description: "The run gets each workbook in the drive that was created or modified.",
  action: listWorkbooks,
  input: () => ({
    query: ".xlsx",
    xlsxOnly: true,
    orderby: "lastModifiedDateTime desc",
    top: 100,
  }),
  items: (result) => (result as { value?: unknown[] }).value ?? [],
  idOf: (item) => {
    const w = item as { id?: unknown; lastModifiedDateTime?: unknown };
    return `${String(w.id ?? "")}:${String(w.lastModifiedDateTime ?? "")}`;
  },
  output: [{ key: "id", type: "string", label: "Workbook ID" }],
  sample: {
    id: "workbook-1",
    name: "Budget.xlsx",
    lastModifiedDateTime: "2026-11-09T12:00:00Z",
  },
  maxPages: 1,
});
