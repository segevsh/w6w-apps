import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listScreens from "../actions/list-screens.ts";

/** Zeplin's created sort is the documented default screen feed order. */
export default pollFromListAction({
  key: "new-screen",
  title: "New Screen",
  description: "The run gets each newly created screen in a Zeplin project.",
  action: listScreens,
  input: (params: { projectId?: unknown }) => ({
    projectId: String(params.projectId ?? ""),
    sort: "created",
  }),
  params: [{ key: "projectId", label: "Project ID", type: "string", required: true }],
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Screen ID" }],
  sample: { id: "screen-sample", name: "Home" },
  maxPages: 1,
});
