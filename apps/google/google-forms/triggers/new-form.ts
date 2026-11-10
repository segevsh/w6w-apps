import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listForms from "../actions/list-forms.ts";

export default pollFromListAction({
  key: "new-form",
  title: "New Form",
  description: "The run gets each newly created Google Form.",
  action: listForms,
  input: () => ({ pageSize: 200, orderBy: "createdTime desc" }),
  items: (result) => (result as { files?: unknown[] }).files ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Form ID" }],
  sample: { id: "1AbCd" },
  maxPages: 1,
});
