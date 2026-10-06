import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, seg } from "../lib/client.ts";

interface Input {
  sequenceId: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDesc?: boolean;
  includeVariables?: boolean;
}

const sequenceRecipientList: ActionDefinition<Input> = {
  key: "sequence-recipient-list",
  type: "read",
  resource: "sequence",
  title: "List Sequence Recipients",
  description:
    "List the activated recipients of a sequence. Mixmax answers a bare array here, paged with limit and offset (max 50 per page, 10,000 total).",
  params: [
    {
      key: "sequenceId",
      label: "Sequence ID",
      type: "string",
      required: true,
      hint: "The sequence to read.",
    },
    { key: "limit", label: "Limit", type: "number", hint: "Records per page (maximum 50)." },
    { key: "offset", label: "Offset", type: "number", hint: "Records to skip." },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      hint: "e.g. `email`, `lastStage`, `lastMessageCreated`.",
    },
    {
      key: "sortDesc",
      label: "Sort descending",
      type: "boolean",
      hint: "Sort in descending order.",
    },
    {
      key: "includeVariables",
      label: "Include variables",
      type: "boolean",
      hint: "Include recipient variables.",
    },
  ],
  output: [{ key: "recipients", type: "array", label: "Recipients" }, {
    key: "count",
    type: "number",
    label: "Recipients in this page",
  }],

  async execute(input, ctx) {
    const r = await new MixmaxClient(ctx).request(
      "GET",
      `/sequences/${seg(input.sequenceId)}/recipients`,
      {
        query: {
          limit: input.limit,
          offset: input.offset,
          sortBy: input.sortBy,
          sortDesc: input.sortDesc,
          includeVariables: input.includeVariables,
        },
      },
    );
    const recipients = Array.isArray(r) ? r : [];
    return { recipients, count: recipients.length };
  },
};

export default sequenceRecipientList;
