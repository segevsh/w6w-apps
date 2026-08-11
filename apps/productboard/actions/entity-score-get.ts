import type { ActionDefinition } from "@w6w/types";
import { type DataResult, encodeId, ProductboardClient } from "../lib/client.ts";
import { entityIdParam } from "../lib/params.ts";

/**
 * `GET /v2/entities/{id}/score` — the customer score for one entity.
 *
 * Marked **"(Beta)"** by the vendor in its own operation summary
 * (`getCustomerScore`, `customer-scores.yaml`), and that word is carried into
 * this action's description rather than quietly dropped: it is the one endpoint
 * in this app whose shape the vendor has reserved the right to change.
 *
 * It sits in its own OpenAPI document but on an `/entities` path, so it is
 * grouped with the entity actions here rather than given a resource of its own.
 */
interface Input {
  entityId: string;
}

const entityScoreGet: ActionDefinition<Input, DataResult> = {
  key: "entity-score-get",
  type: "read",
  resource: "entity",
  title: "Get customer score (beta)",
  description:
    "Retrieve the customer score Productboard computes for one entity. The vendor documents this " +
    "endpoint as beta, so treat its response shape as unstable.",
  params: [entityIdParam],
  output: [{ key: "data", type: "object", label: "Customer score" }],

  async execute(input, ctx) {
    const data = await new ProductboardClient(ctx).data(
      `/entities/${encodeId(input.entityId)}/score`,
    );
    return { data };
  },
};

export default entityScoreGet;
