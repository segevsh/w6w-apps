import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listPages from "../actions/list-pages.ts";

export default pollFromListAction({
  key: "new-or-updated-page",
  title: "New or Updated Page",
  description: "The run gets each newly created or modified OneNote page.",
  action: listPages,
  input: () => ({ top: 100 }),
  items: (result) => (result as { value?: unknown[] }).value ?? [],
  idOf: (item) => {
    const page = item as { id?: unknown; lastModifiedDateTime?: unknown };
    return `${String(page.id ?? "")}:${String(page.lastModifiedDateTime ?? "")}`;
  },
  output: [{ key: "id", type: "string", label: "Page ID" }],
  sample: { id: "page-new", title: "New page", lastModifiedDateTime: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
