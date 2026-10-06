import type { ActionDefinition } from "@w6w/types";
import { call, csv, encodeId, V2 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

type Input = {
  prospect_id: string;
  campaign_id?: string;
};

const prospectResponseList: ActionDefinition<Input> = {
  key: "prospect-response-list",
  type: "read",
  resource: "prospect",
  title: "List Prospect Responses",
  description:
    "List the email replies a prospect has sent, oldest first, optionally limited to campaigns.",
  params: [
    str("prospect_id", "Prospect ID", { required: true }),
    str("campaign_id", "Campaign IDs", {
      hint: "Comma-separated campaign IDs to limit the replies.",
    }),
  ],
  output: [
    { key: "prospect_id", type: "number", label: "Prospect ID" },
    { key: "email", type: "string", label: "Prospect email" },
    {
      key: "responses",
      type: "array",
      label: "response_id, campaign_id, step, subject, message, delivered",
    },
    { key: "count", type: "number", label: "Replies returned" },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "GET", V2, `/prospects/${encodeId(input.prospect_id)}/responses`, {
      query: { campaign_id: csv(input.campaign_id) },
    }) as { prospect_id?: number; email?: string; responses?: unknown[] };
    const responses = body.responses ?? [];
    return {
      prospect_id: body.prospect_id ?? null,
      email: body.email ?? null,
      responses,
      count: responses.length,
    };
  },
};

export default prospectResponseList;
