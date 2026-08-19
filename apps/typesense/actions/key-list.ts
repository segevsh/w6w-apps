import type { ActionDefinition } from "@w6w/types";
import { TypesenseClient } from "../lib/client.ts";

/**
 * `GET /keys` — the keys this node will accept, and what each may do.
 *
 * ## Only a prefix comes back, and that is deliberate
 *
 * Typesense returns `value_prefix`, not `value`. The full key is shown once,
 * at creation, and never again — so this list is for auditing what exists, not
 * for recovering a key somebody lost. The answer to a lost key is a new key.
 *
 * ## Actions and collections are the whole security model
 *
 * A key carries a list of actions (`documents:search`, `documents:*`, `*`) and
 * a list of collections (exact names, or a `*` glob). A search-only key
 * scoped to one collection can do nothing else, which is what a front end
 * should hold. A key with `["*"]` on `["*"]` can drop every collection.
 *
 * This action flags the second kind, because "we have a search key in the
 * front end" and "we have *the admin key* in the front end" look identical
 * from the outside.
 *
 * ## Expiry is a Unix timestamp, and no expiry is the default
 *
 * `expires_at` is seconds since the epoch. Its absence — or the far-future
 * sentinel Typesense uses — means the key works forever.
 */
const action: ActionDefinition = {
  key: "key-list",
  type: "search",
  resource: "key",
  title: "List API keys",
  description:
    "The keys this node accepts and what each may do. Only a PREFIX of each key comes back — " +
    "the value is shown once at creation and never again. Flags unrestricted keys, which look " +
    "identical from outside to a search-only one.",
  params: [],
  output: [
    { key: "keys", type: "array", label: "The keys, by prefix" },
    { key: "count", type: "number", label: "How many" },
    { key: "unrestricted", type: "array", label: "Keys that can do anything, anywhere" },
    { key: "searchOnly", type: "array", label: "Keys that can only search" },
    { key: "expiringSoon", type: "array", label: "Expiring within 30 days" },
    { key: "neverExpire", type: "number", label: "Keys with no expiry" },
  ],

  async execute(_input, ctx) {
    const body = await new TypesenseClient(ctx).request<{
      keys?: Array<{
        id?: number;
        description?: string;
        actions?: string[];
        collections?: string[];
        value_prefix?: string;
        expires_at?: number;
      }>;
    }>("/keys");

    const keys = body?.keys ?? [];
    const label = (key: { description?: string; value_prefix?: string; id?: number }) =>
      key?.description || `${key?.value_prefix ?? "?"}… (id ${key?.id})`;

    // `*` on `*` can drop every collection on the node.
    const unrestricted = keys.filter((key) =>
      (key?.actions ?? []).includes("*") && (key?.collections ?? []).includes("*")
    );
    const searchOnly = keys.filter((key) =>
      (key?.actions ?? []).length > 0 &&
      (key?.actions ?? []).every((a) => a === "documents:search")
    );

    if (unrestricted.length) {
      ctx.log(
        "warn",
        "some keys can perform every action on every collection, including dropping them — " +
          "worth knowing which systems hold one",
        { count: unrestricted.length },
      );
    }

    // Typesense uses a far-future sentinel for keys that never expire.
    const FOREVER = 4_000_000_000;
    const soon = Math.floor(Date.now() / 1000) + 30 * 86_400;

    return {
      keys: keys.map((key) => ({
        id: key?.id,
        description: key?.description,
        actions: key?.actions ?? [],
        collections: key?.collections ?? [],
        valuePrefix: key?.value_prefix,
        expiresAt: key?.expires_at,
      })),
      count: keys.length,
      unrestricted: unrestricted.map(label),
      searchOnly: searchOnly.map(label),
      expiringSoon: keys
        .filter((key) =>
          typeof key?.expires_at === "number" && key.expires_at < soon &&
          key.expires_at < FOREVER
        )
        .map((key) => ({ key: label(key), expiresAt: key?.expires_at })),
      neverExpire:
        keys.filter((key) => !key?.expires_at || Number(key.expires_at) >= FOREVER).length,
    };
  },
};

export default action;
