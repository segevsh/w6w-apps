import groupList from "../actions/group-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-group",
  title: "New Group",
  description: "The run gets each group newly created in the Klipfolio account.",
  action: groupList as never,
  idLabel: "Group ID",
  sample: { change: "added", key: "g1a2b3", values: { id: "g1a2b3", name: "Finance" } },
});
