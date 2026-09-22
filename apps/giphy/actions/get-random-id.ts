import type { ActionDefinition } from "@w6w/types";
import { GiphyClient } from "../lib/client.ts";

/**
 * `GET /v1/randomid` — a random, reusable id.
 *
 * GIPHY documents the `random_id` it returns as a stable, privacy-safe
 * identifier a caller may pass as `customer_id` on its other endpoints. This
 * app does **not** do that: `customer_id` is an advanced, optional field that
 * the documented surface this app is built from does not need, so no action
 * here sends it or exposes it. What is left is a genuinely useful primitive —
 * a random id a workflow can mint and store as its own correlation key — and
 * that is all this action promises.
 */
const getRandomId: ActionDefinition<Record<string, never>> = {
  key: "get-random-id",
  type: "read",
  title: "Get Random ID",
  description: "Fetch a random id from GIPHY. Needs no parameters.",
  resource: "random-id",
  output: [{ key: "data.random_id", type: "string", label: "Random id" }],

  async execute(_input, ctx) {
    const data = await new GiphyClient(ctx).data<{ random_id?: string }>("/randomid");
    return { data };
  },
};

export default getRandomId;
