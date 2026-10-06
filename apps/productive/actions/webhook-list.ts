import type { ActionDefinition } from "@w6w/types";
import { listQuery, omitKeys, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List webhooks (`GET /webhooks`). The signature token and custom headers are removed from the answer.
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  typeId?: number;
  stateId?: number;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List webhooks (`GET /webhooks`). The signature token and custom headers are removed from the answer.",
  params: [
    {
      "key": "typeId",
      "label": "Type",
      "type": "select",
      "options": [{ "value": 1, "label": "Webhook" }, { "value": 2, "label": "Zapier" }],
    },
    {
      "key": "stateId",
      "label": "Delivery state",
      "type": "select",
      "options": [{ "value": 1, "label": "Working" }, { "value": 2, "label": "Issues" }, {
        "value": 3,
        "label": "Waiting",
      }],
    },
    ...listParams(
      "Not documented for this resource; the vendor answers 400 on an unsupported sort.",
    ),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/webhooks", {
      query: listQuery(input, { "type_id": input.typeId, "state_id": input.stateId }),
    });
    items.items = (items.items as Record<string, unknown>[]).map((i) =>
      omitKeys(i, ["signature_token", "custom_headers"])
    );
    return items;
  },
};

export default webhookList;
