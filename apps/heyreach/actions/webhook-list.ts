import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  includeCustomHeaders?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * `POST /api/public/webhooks/GetAllWebhooks` — the workspace's webhooks.
 *
 * A `POST` for a read — the collection endpoints are POST because their paging
 * travels in the body (`{ offset, limit, includeCustomHeaders }`).
 *
 * `includeCustomHeaders` is worth turning on when a workflow *verifies*
 * deliveries, and worth leaving off otherwise: custom headers routinely carry a
 * shared secret the receiving service checks, so the response can contain
 * credential material. It is off by default here, matching the API's own
 * optional field, and the hint says so.
 *
 * The document declares no default or maximum for `limit`, so the app's own
 * default is stated rather than inherited from an unknown.
 */
const action: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the workspace's webhooks with their event type, target URL and campaigns " +
    "(POST /api/public/webhooks/GetAllWebhooks).",
  params: [
    {
      key: "includeCustomHeaders",
      label: "Include custom headers",
      type: "boolean",
      hint: "Send the webhooks' custom headers in the response. They often carry a shared " +
        "secret, so this is off unless asked for.",
    },
    ...paginationParams(50, "Webhooks per page. The API documents no default or maximum."),
  ],
  output: [
    { key: "totalCount", type: "number", label: "Matching webhooks" },
    { key: "items", type: "array", label: "Webhooks" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/webhooks/GetAllWebhooks", {
      method: "POST",
      body: compact({
        offset: input.offset,
        limit: input.limit,
        includeCustomHeaders: input.includeCustomHeaders,
      }),
    });
  },
};

export default action;
