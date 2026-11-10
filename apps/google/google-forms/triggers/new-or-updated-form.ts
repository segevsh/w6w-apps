import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listForms from "../actions/list-forms.ts";

export default pollFromListAction({
  key: "new-or-updated-form",
  title: "New or Updated Form",
  description: "The run gets each newly created or updated Google Form.",
  action: listForms,
  input: () => ({ pageSize: 1000, orderBy: "modifiedTime desc" }),
  items: (result) => (result as { files?: unknown[] }).files ?? [],
  idOf: (item) => {
    const form = item as { id?: unknown; modifiedTime?: unknown };
    return `${String(form.id ?? "")}:${String(form.modifiedTime ?? "")}`;
  },
  output: [{ key: "id", type: "string", label: "Form ID" }],
  sample: { id: "1AbCd", modifiedTime: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
