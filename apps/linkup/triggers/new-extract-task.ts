import extractList from "../actions/extract-list.ts";
import { newTaskTrigger } from "../lib/triggers.ts";

export default newTaskTrigger({
  key: "new-extract-task",
  title: "New Extract Task",
  description: "The run gets each extract task newly created in the Linkup organisation.",
  action: extractList as never,
  idLabel: "Extract task ID",
});
