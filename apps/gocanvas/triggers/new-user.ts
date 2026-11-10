import { snapshotTrigger } from "../lib/triggers.ts";
import userList from "../actions/user-list.ts";

interface Rec {
  id?: number | string;
}

/** Users are read whole (`GET /users`, pages of 100, no sort or created filter documented); ids are diffed between checks. */
const newUser = snapshotTrigger({
  key: "new-user",
  title: "New User",
  description: "The run gets each user that appears in the company user list (Get Many Users).",
  action: userList,
  paged: true,
  idOf: (x) => String((x as Rec).id ?? ""),
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "login", type: "string", label: "Login (email)" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "enabled", type: "boolean", label: "Enabled" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 20079,
    type: "user",
    created_at: "2023-06-16 23:09:20 UTC",
    enabled: true,
    first_name: "Sophie",
    last_name: "Olufsen",
    login: "sophie.olufsen@acmecorp.com",
  },
});

export default newUser;
