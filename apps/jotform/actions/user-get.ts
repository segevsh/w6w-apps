import type { ActionDefinition } from "@w6w/types";
import { JotformClient } from "../lib/client.ts";

/**
 * GET /user — account details for the key's owner: username, name, email,
 * website, time zone, account type and status.
 */
const userGet: ActionDefinition<Record<string, never>> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Account",
  description: "Retrieve the Jotform account this API key belongs to.",
  params: [],
  output: [
    { key: "username", type: "string", label: "Username" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "account_type", type: "string", label: "Plan URL" },
    { key: "status", type: "string", label: "Status (ACTIVE / DELETED / SUSPENDED)" },
    { key: "time_zone", type: "string", label: "Time zone (IANA)" },
  ],

  execute(_input, ctx) {
    return new JotformClient(ctx).content<Record<string, unknown>>("/user");
  },
};

export default userGet;
