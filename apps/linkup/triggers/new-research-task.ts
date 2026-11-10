import researchList from "../actions/research-list.ts";
import { newTaskTrigger } from "../lib/triggers.ts";

export default newTaskTrigger({
  key: "new-research-task",
  title: "New Research Task",
  description: "The run gets each research task newly created in the Linkup organisation.",
  action: researchList as never,
  idLabel: "Research task ID",
});
