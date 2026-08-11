import type { ActionDefinition } from "@w6w/types";
import { encodeId, type ListResult, ProductboardClient, toList } from "../lib/client.ts";
import { connectionStateOptions, listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `GET /v2/plugin-integrations/{integrationId}/connections` — what this plugin
 * is currently connected to, and how that is going.
 *
 * The `state[]` filter is the operational one. A connection is in exactly one of
 * four states, and the vendor documents what each renders as on the entity's
 * push button:
 *
 *  - `connected` — linked; the button shows a label and opens `targetUrl`
 *  - `error` — the last attempt failed; the button shows an error icon
 *  - `progress` — being established asynchronously
 *  - `initial` — no connection; the button shows the integration's default label
 *
 * `state[]=error` is therefore the query behind "which links are broken right
 * now", which is the whole reason to automate against this endpoint.
 */
interface Input {
  integrationId: string;
  states?: string[] | string;
  pageCursor?: string;
}

const pluginIntegrationConnectionList: ActionDefinition<Input, ListResult> = {
  key: "plugin-integration-connection-list",
  type: "search",
  resource: "plugin-integration",
  title: "List plugin connections",
  description:
    "List the entities a plugin integration is connected to, filtered by connection state. " +
    "Filtering on `error` finds the links that are currently broken.",
  params: [
    {
      key: "integrationId",
      label: "Integration ID",
      type: "string",
      required: true,
      hint: "UUID from a List plugin integrations result.",
    },
    {
      key: "states",
      label: "Connection states",
      type: "multiselect",
      options: connectionStateOptions,
      hint: "Sent as repeated `state[]` values. Leave empty for every state.",
    },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list(
      `/plugin-integrations/${encodeId(input.integrationId)}/connections`,
      { query: { "state[]": toList(input.states), pageCursor: input.pageCursor } },
    );
  },
};

export default pluginIntegrationConnectionList;
