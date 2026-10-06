import type { ActionDefinition } from "@w6w/types";
import { PhraseClient } from "../lib/client.ts";

/**
 * `GET /v2/user` — return the user the access token belongs to (id, username, name, email, language).
 */
type Input = Record<string, never>;

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Return the user the access token belongs to (id, username, name, email, language).",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "name", type: "string", label: "Display name" },
    { key: "email", type: "string", label: "Email" },
    { key: "language", type: "string", label: "UI language" },
  ],

  execute(_input, ctx) {
    return new PhraseClient(ctx).json(`/user`);
  },
};

export default userGet;
