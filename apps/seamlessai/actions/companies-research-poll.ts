import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, toList } from "../lib/client.ts";

/** `GET /api/client/v2/companies/research/poll` — Poll Company Research. */
interface Input {
  requestIds: unknown;
}

const companiesResearchPoll: ActionDefinition<Input> = {
  key: "companies-research-poll",
  type: "read",
  resource: "company",
  title: "Poll Company Research",
  description:
    "Check research requests started by companies-research. A result is complete when its status is `done`; other states are `researching`, `missing` and `error`.",
  params: [
    {
      key: "requestIds",
      label: "Request IDs",
      type: "json",
      required: true,
      hint:
        "requestIds from companies-research (up to 100): a JSON array, or comma / newline separated.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the poll ran" },
    { key: "data", type: "array", label: "One entry per request: requestId, status, company" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/companies/research/poll", {
      query: compact({
        requestIds: need(toList(input.requestIds)?.join(","), "Request IDs"),
      }) as Record<string, string | number | boolean>,
    });
  },
};

export default companiesResearchPoll;
