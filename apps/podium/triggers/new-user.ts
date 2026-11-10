import userList from "../actions/user-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** The run gets each user newly added to a location the token can access (`GET /v4/users`, diffed by uid each check). Brief 9.1 (c). */
export default snapshotTrigger({
  key: "new-user",
  title: "New User",
  description:
    "The run gets each user newly added to a location the token can access (`GET /v4/users`, diffed by uid each check).",
  action: userList,
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { uid: "user_1", firstName: "Pat", lastName: "Example", email: "pat@example.com" },
});
