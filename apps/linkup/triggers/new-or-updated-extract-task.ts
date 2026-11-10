import extractList from "../actions/extract-list.ts";
import { newTaskTrigger } from "../lib/triggers.ts";

export default newTaskTrigger({
  key: "new-or-updated-extract-task",
  title: "New or Updated Extract Task",
  description:
    "The run gets each extract task newly created in the Linkup organisation or whose status or output changed.",
  action: extractList as never,
  idLabel: "Extract task ID",
  updated: true,
});
