import type { ActionDefinition } from "@w6w/types";
import { listOf, numberOf, RingoverClient } from "../lib/client.ts";

interface Input {
  isUser?: boolean;
  isIvr?: boolean;
  isFax?: boolean;
  isConference?: boolean;
  isAvailable?: boolean;
}

const numberList: ActionDefinition<Input> = {
  key: "number-list",
  type: "read",
  resource: "number",
  title: "List Numbers",
  description:
    "List the team phone numbers by assignment. Defaults to unassigned (available) numbers; the other filters need Monitoring on the key.",
  params: [
    { key: "isUser", label: "Assigned to users", type: "boolean" },
    { key: "isIvr", label: "Assigned to IVRs", type: "boolean" },
    { key: "isFax", label: "Fax", type: "boolean" },
    { key: "isConference", label: "Assigned to conferences", type: "boolean" },
    {
      key: "isAvailable",
      label: "Unassigned",
      type: "boolean",
      hint: "Defaults to true. If false, at least one other filter must be true.",
    },
  ],
  output: [
    { key: "numbers", type: "array", label: "Numbers" },
    { key: "count", type: "number", label: "Numbers returned" },
  ],

  async execute(input, ctx) {
    const body = await new RingoverClient(ctx).request("GET", "/numbers", {
      query: {
        is_user: input.isUser,
        is_ivr: input.isIvr,
        is_fax: input.isFax,
        is_conference: input.isConference,
        is_available: input.isAvailable,
      },
    });
    return { numbers: listOf(body, "list"), count: numberOf(body, "list_count") };
  },
};

export default numberList;
