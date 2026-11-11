import userList from "../actions/user-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the Klipfolio account.",
  action: userList as never,
  idLabel: "User ID",
  sample: { change: "added", key: "u1a2b3", values: { id: "u1a2b3", name: "Ada Lovelace" } },
});
