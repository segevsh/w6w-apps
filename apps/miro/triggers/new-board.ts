import { pollFromListAction } from "../../_shared/poll/mod.ts";
import boardList from "../actions/board-list.ts";

export default pollFromListAction({
  key: "new-board",
  title: "New Board",
  description: "The run gets each newly created Miro board.",
  action: boardList,
  input: () => ({ returnAll: false, limit: 100, sort: "last_created" }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Board ID" }],
  sample: { id: "board-new", name: "New board" },
  maxPages: 1,
});
