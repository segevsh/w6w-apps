import { pollFromListAction } from "../../_shared/poll/mod.ts";
import formList from "../actions/form-list.ts";

export default pollFromListAction({
  key: "new-form",
  title: "New Form",
  description: "The run gets each newly created registration form.",
  action: formList,
  input: () => ({ sort: "desc", limit: 50 }),
  items: (result) => (result as { forms?: unknown[] }).forms ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Form ID" }],
  sample: { id: 101 },
  maxPages: 1,
});
