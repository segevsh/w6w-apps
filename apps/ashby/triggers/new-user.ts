import userList from "../actions/user-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** Emits each user added to the Ashby organisation (`user.list`, a small whole collection diffed by id each check). Brief 9.1 (c). */
export default snapshotTrigger({
  key: "new-user",
  title: "New User",
  description:
    "Emits each user added to the Ashby organisation (`user.list`, a small whole collection diffed by id each check).",
  action: userList,
  list: "users",
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: "user-101", firstName: "Pat", lastName: "Example", email: "pat@example.com" },
});
