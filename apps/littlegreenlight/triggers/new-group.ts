import groupList from "../actions/group-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-group",
  title: "New Group",
  description: "The run gets each newly created constituent group.",
  action: groupList,
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 1001, name: "Volunteers" },
});
