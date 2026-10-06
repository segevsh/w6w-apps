import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";
import { requireDate } from "../lib/params.ts";

interface Input {
  from: string;
  to: string;
  includeHourly?: boolean;
  includePrivate?: boolean;
  includePending?: boolean;
  includeWorkingRequests?: boolean;
}

/** `GET /v1/timeoff/whosout` — who is out between two dates, limited to the people the service user can see. */
const timeoffWhosout: ActionDefinition<Input> = {
  key: "timeoff-whosout",
  type: "read",
  resource: "timeoff",
  title: "Who's Out",
  description: "List who is out of office between two dates.",
  params: [
    { key: "from", label: "From", type: "date", required: true },
    { key: "to", label: "To", type: "date", required: true },
    { key: "includeHourly", label: "Include hourly requests", type: "boolean", default: false },
    { key: "includePrivate", label: "Include private requests", type: "boolean", default: false },
    { key: "includePending", label: "Include pending requests", type: "boolean", default: false },
    {
      key: "includeWorkingRequests",
      label: "Include 'working' policy types",
      type: "boolean",
      default: false,
      hint: "Requests for policies like work-from-home or business travel.",
    },
  ],
  output: [{
    key: "outs",
    type: "object",
    label: "Time off entries; shape varies by request type",
  }],

  async execute(input, ctx) {
    return await new HibobClient(ctx).get("/timeoff/whosout", {
      from: requireDate(input.from, "from"),
      to: requireDate(input.to, "to"),
      includeHourly: input.includeHourly ? true : undefined,
      includePrivate: input.includePrivate ? true : undefined,
      includePending: input.includePending ? true : undefined,
      includeWorkingRequests: input.includeWorkingRequests ? true : undefined,
    });
  },
};

export default timeoffWhosout;
