import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/agents` - lists the agents on the account. */
export default lookupAction({
  key: "list-agents",
  title: "List Agents",
  description: "List the agents on the account.",
  path: "/zapier/agents",
});
