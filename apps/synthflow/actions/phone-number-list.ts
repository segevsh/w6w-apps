import type { ActionDefinition } from "@w6w/types";
import { listResult, SynthflowClient } from "../lib/client.ts";
import { limitParam, offsetParam, workspaceParam } from "../lib/params.ts";

interface Input {
  workspace: string;
  limit?: number;
  offset?: number;
  is_available?: boolean;
}

const phoneNumberList: ActionDefinition<Input> = {
  key: "phone-number-list",
  type: "search",
  resource: "phone-number",
  title: "List Phone Numbers",
  description: "List the workspace's phone numbers.",
  params: [
    workspaceParam,
    limitParam,
    offsetParam,
    {
      key: "is_available",
      label: "Only inbound-available",
      type: "boolean",
      hint: "true: only numbers not assigned to an inbound agent; false: only assigned ones.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Phone numbers" }, {
    key: "pagination",
    type: "object",
    label: "Pagination",
  }],

  async execute(input, ctx) {
    const r = await new SynthflowClient(ctx).data<Record<string, unknown>>("/numbers", {
      query: {
        workspace: input.workspace,
        limit: input.limit,
        offset: input.offset,
        is_available: input.is_available,
      },
    });
    return listResult(r, "phone_numbers");
  },
};

export default phoneNumberList;
