import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, toList } from "../lib/client.ts";

/** `GET /api/client/v2/contacts/research/poll` — Poll Contact Research. */
interface Input {
  requestIds: unknown;
}

const contactsResearchPoll: ActionDefinition<Input> = {
  key: "contacts-research-poll",
  type: "read",
  resource: "contact",
  title: "Poll Contact Research",
  description:
    "Check research requests started by contacts-research. Poll every 2-5 seconds; a result is complete when its status is `done`.",
  params: [
    {
      key: "requestIds",
      label: "Request IDs",
      type: "json",
      required: true,
      hint:
        "requestIds from contacts-research (up to 100): a JSON array, or comma / newline separated.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the poll ran" },
    {
      key: "data",
      type: "array",
      label: "One entry per request: requestId, status, message, contact",
    },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/contacts/research/poll", {
      query: compact({
        requestIds: need(toList(input.requestIds)?.join(","), "Request IDs"),
      }) as Record<string, string | number | boolean>,
    });
  },
};

export default contactsResearchPoll;
