import userList from "../actions/user-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the Leexi workspace.",
  action: userList,
  output: [
    { key: "uuid", type: "string", label: "User UUID" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { uuid: "3f2b9c1e-0000-4000-8000-000000000001", email: "ada@example.com" },
});
