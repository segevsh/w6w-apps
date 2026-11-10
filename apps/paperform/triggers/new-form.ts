import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listForms from "../actions/list-forms.ts";

export default pollFromListAction({
  key: "new-form",
  title: "New Form",
  description: "The run gets each newly created Paperform form.",
  action: listForms,
  input: () => ({ limit: 20, sort: "DESC" }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "slug", type: "string", label: "Slug" },
  ],
  sample: { id: "6501f0c2a8b1d", title: "Contact us", slug: "contact-us" },
  maxPages: 1,
});
