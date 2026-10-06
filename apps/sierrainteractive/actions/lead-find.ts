import type { ActionDefinition } from "@w6w/types";
import { encodeId, SierraClient } from "../lib/client.ts";

interface Input {
  leadIdOrEmail: string;
}

/**
 * `PUT /zapier/findLead/{leadIdOrEmail}` — Sierra documents this lookup as a PUT (it is the
 * Zapier "find" step); it reads and changes nothing, so it is a `read` action.
 */
const leadFind: ActionDefinition<Input> = {
  key: "lead-find",
  type: "read",
  resource: "lead",
  title: "Find Lead",
  description: "Look up a lead by its id or email address.",
  params: [{ key: "leadIdOrEmail", label: "Lead ID or email", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The lead as Sierra returns it" }],

  async execute(input, ctx) {
    return await new SierraClient(ctx).request(
      "PUT",
      `/zapier/findLead/${encodeId(input.leadIdOrEmail)}`,
    );
  },
};

export default leadFind;
