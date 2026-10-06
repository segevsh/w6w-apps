import type { ActionDefinition } from "@w6w/types";
import { SierraClient } from "../lib/client.ts";
import { leadBody, type LeadInput, leadParams } from "../lib/lead.ts";

/** `POST /zapier/leads` — create a lead (Sierra matches an existing one by email/phone). */
const leadCreate: ActionDefinition<LeadInput> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a lead in Sierra Interactive and optionally assign, tag and note it.",
  // No idempotency key exists; a retry may create a duplicate or re-save the same lead.
  idempotent: false,
  params: leadParams,
  output: [{ key: "data", type: "object", label: "Sierra's response for the created lead" }],

  async execute(input, ctx) {
    return await new SierraClient(ctx).request("POST", "/zapier/leads", leadBody(input));
  },
};

export default leadCreate;
