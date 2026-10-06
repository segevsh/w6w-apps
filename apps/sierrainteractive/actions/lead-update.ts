import type { ActionDefinition } from "@w6w/types";
import { encodeId, SierraClient } from "../lib/client.ts";
import { leadBody, type LeadInput, leadParams } from "../lib/lead.ts";

interface Input extends LeadInput {
  leadIdOrEmailOrPhone: string;
}

/** `PUT /zapier/leads/{leadIdOrEmailOrPhone}` — update an existing lead. */
const leadUpdate: ActionDefinition<Input> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Update a lead identified by its id, email address or phone number.",
  idempotent: true,
  params: [
    {
      key: "leadIdOrEmailOrPhone",
      label: "Lead ID, email or phone",
      type: "string",
      required: true,
    },
    ...leadParams,
  ],
  output: [{ key: "data", type: "object", label: "Sierra's response for the updated lead" }],

  async execute(input, ctx) {
    const { leadIdOrEmailOrPhone, ...fields } = input;
    return await new SierraClient(ctx).request(
      "PUT",
      `/zapier/leads/${encodeId(leadIdOrEmailOrPhone)}`,
      leadBody(fields),
    );
  },
};

export default leadUpdate;
