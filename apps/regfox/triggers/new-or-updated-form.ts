import { pollFromListAction } from "../../_shared/poll/mod.ts";
import formList from "../actions/form-list.ts";

export default pollFromListAction({
  key: "new-or-updated-form",
  title: "New or Updated Form",
  description: "The run gets each newly created or updated registration form.",
  action: formList,
  input: () => ({ sort: "desc", limit: 50 }),
  items: (result) => (result as { forms?: unknown[] }).forms ?? [],
  idOf: (item) => {
    const form = item as { id?: unknown; dateUpdated?: unknown };
    return `${form.id ?? ""}:${form.dateUpdated ?? ""}`;
  },
  output: [{ key: "id", type: "number", label: "Form ID" }],
  sample: { id: 101, dateUpdated: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
