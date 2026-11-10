import groupUserList from "../actions/group-user-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-group-user",
  title: "New Group Member",
  description: "The run gets each user newly added to the chosen Klipfolio group.",
  action: groupUserList as never,
  idLabel: "User ID",
  sample: { change: "added", key: "u1a2b3", values: { id: "u1a2b3", first_name: "Ada" } },
  params: [{
    key: "group_id",
    label: "Group ID",
    type: "string",
    required: true,
    hint: "The group to watch (the id from Klipfolio's group list).",
  }],
  paged: false,
});
