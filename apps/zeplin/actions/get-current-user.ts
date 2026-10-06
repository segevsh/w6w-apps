import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "get-current-user",
  resource: "user",
  title: "Get Current User",
  description: "Get the user the token belongs to (GET /v1/users/me).",
  params: [],
  path: () => "/users/me",
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "username", type: "string", label: "Username" },
    { key: "emotar", type: "string", label: "Emotar" },
    { key: "avatar", type: "string", label: "Avatar URL" },
    { key: "last_seen", type: "number", label: "Last seen (UNIX seconds)" },
  ],
});
