import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, recordResult } from "../lib/client.ts";

interface Input {
  full?: boolean;
}

/** `GET /profile`. */
const profileGet: ActionDefinition<Input> = {
  key: "profile-get",
  type: "read",
  resource: "user",
  title: "Get Profile",
  description: "Get the user the API key belongs to: id, company, name, email and last login.",
  params: [
    {
      key: "full",
      label: "Include associations",
      type: "boolean",
      hint: "Include associations (tab instances, dashboard properties, permissions).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "company", type: "object", label: "Company id and name" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("GET", `/profile`, {
      query: { full: input.full },
    });
    return recordResult(env);
  },
};

export default profileGet;
