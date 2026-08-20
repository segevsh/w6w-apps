import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /predictions` — verified against Replicate's OpenAPI document
 * (`predictions.list`).
 *
 * Every prediction the token's account has made, newest first. Paged by a
 * **cursor that is a complete URL** — `next` is an absolute address rather than
 * a token — which the client follows verbatim rather than rebuilding.
 *
 * Useful for reconciling spend after the fact: each row carries its own
 * `metrics.predict_time`, and Replicate exposes no account-level total.
 */
const action: ActionDefinition = {
  key: "prediction-list",
  type: "read",
  resource: "prediction",
  title: "List predictions",
  description: "The account's predictions, newest first.",
  params: [
    {
      key: "createdAfter",
      label: "Created After",
      type: "string",
      default: "",
      hint: "ISO 8601 timestamp.",
    },
    { key: "createdBefore", label: "Created Before", type: "string", default: "" },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Replicate predictions", { returnAll, limit });

    return await new ReplicateClient(ctx).requestAll("/predictions", {
      query: {
        created_after: (p.createdAfter as string) || undefined,
        created_before: (p.createdBefore as string) || undefined,
      },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
