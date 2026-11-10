import researchList from "../actions/research-list.ts";
import { newTaskTrigger } from "../lib/triggers.ts";

export default newTaskTrigger({
  key: "new-or-updated-research-task",
  title: "New or Updated Research Task",
  description:
    "The run gets each research task newly created in the Linkup organisation or whose status or output changed.",
  action: researchList as never,
  idLabel: "Research task ID",
  updated: true,
});
