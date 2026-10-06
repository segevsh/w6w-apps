import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

type Input = Record<string, never>;

const meGet: ActionDefinition<Input> = {
  key: "me-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Fetch the Fortnox user the access token belongs to (needs the profile scope).",
  params: [],
  output: [
    {
      "key": "Me",
      "type": "object",
      "label": "User record (Id, Name, Email, Locale, SysAdmin)",
    },
  ],

  execute(_input, ctx) {
    return new FortnoxClient(ctx).get("/3/me");
  },
};

export default meGet;
