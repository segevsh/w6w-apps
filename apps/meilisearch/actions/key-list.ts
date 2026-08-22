import type { ActionDefinition } from "@w6w/types";
import { MeilisearchClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /keys` — verified against Meilisearch's OpenAPI document
 * (`list_api_keys`).
 *
 * Lists the instance's API keys and, crucially, **what each one is allowed to
 * do**: `actions` and `indexes` are the scope. That is how you answer "why did
 * this write fail with 403 when the key works" — the key is scoped, and
 * Meilisearch reports a scope failure with the same `invalid_api_key` code as a
 * wrong key.
 *
 * Only a key permitted to read keys can call this — usually the master key.
 */
const action: ActionDefinition = {
  key: "key-list",
  type: "read",
  resource: "key",
  title: "List API keys",
  description: "List API keys and the actions and indexes each is scoped to.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Meilisearch API keys", { returnAll, limit });

    return await new MeilisearchClient(ctx).requestAll("/keys", {}, returnAll ? Infinity : limit);
  },
};

export default action;
