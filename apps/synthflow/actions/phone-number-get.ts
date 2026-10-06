import type { ActionDefinition } from "@w6w/types";
import { SynthflowClient } from "../lib/client.ts";
import { workspaceParam } from "../lib/params.ts";

interface Input {
  phone_number_slug: string;
  workspace: string;
}

const phoneNumberGet: ActionDefinition<Input> = {
  key: "phone-number-get",
  type: "read",
  resource: "phone-number",
  title: "Get Phone Number",
  description: "Read one phone number by slug (the number without the leading +).",
  params: [
    {
      key: "phone_number_slug",
      label: "Phone number slug",
      type: "string",
      required: true,
      hint: "The number without the leading +, e.g. 14155551234.",
    },
    workspaceParam,
  ],
  output: [{ key: "phone_number", type: "string", label: "Phone number (E.164)" }, {
    key: "assistants",
    type: "array",
    label: "Attached agent IDs",
  }, { key: "is_available", type: "boolean", label: "Available for inbound" }],

  async execute(input, ctx) {
    return await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/numbers/${encodeURIComponent(input.phone_number_slug)}`,
      { query: { workspace: input.workspace } },
    );
  },
};

export default phoneNumberGet;
