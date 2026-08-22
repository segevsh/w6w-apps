import type { ActionDefinition } from "@w6w/types";
import { TypesenseClient } from "../lib/client.ts";

/**
 * `GET /aliases` — the indirection that makes zero-downtime reindexing
 * possible.
 *
 * ## An alias is a name that points at a collection
 *
 * Searches use the alias; the alias points at `products_v3`. Reindexing means
 * building `products_v4` beside it and moving the pointer, so no search ever
 * sees an empty or half-built collection.
 *
 * This action reports which collections are reachable *only* through an alias,
 * and which aliases point at a collection that no longer exists — the second
 * being a silent 404 on every search through that name.
 */
const action: ActionDefinition = {
  key: "alias-list",
  type: "read",
  resource: "alias",
  title: "List aliases",
  description:
    "The aliases on this node and what they point at — the indirection that makes zero-downtime " +
    "reindexing work. Flags aliases pointing at a collection that no longer exists, which is a " +
    "404 on every search through that name.",
  params: [],
  output: [
    { key: "aliases", type: "array", label: "Alias to collection" },
    { key: "count", type: "number", label: "How many" },
    { key: "names", type: "array", label: "Just the alias names" },
    { key: "broken", type: "array", label: "Pointing at a collection that is gone" },
    { key: "aliasedCollections", type: "array", label: "Collections reached through an alias" },
  ],

  async execute(_input, ctx) {
    const client = new TypesenseClient(ctx);
    const body = await client.request<{
      aliases?: Array<{ name?: string; collection_name?: string }>;
    }>("/aliases");

    const aliases = body?.aliases ?? [];

    const collections = await client.request<Array<{ name?: string }>>("/collections");
    const existing = new Set((collections ?? []).map((collection) => collection?.name));

    // An alias outlives the collection it names, and every search 404s.
    const broken = aliases
      .filter((alias) => alias?.collection_name && !existing.has(alias.collection_name))
      .map((alias) => ({ alias: alias?.name, collection: alias?.collection_name }));

    if (broken.length) {
      ctx.log(
        "warn",
        "some aliases point at collections that no longer exist — every search through those " +
          "names returns 404, and nothing else reports it",
        { broken: broken.length },
      );
    }

    return {
      aliases: aliases.map((alias) => ({
        name: alias?.name,
        collection: alias?.collection_name,
      })),
      count: aliases.length,
      names: aliases.map((alias) => alias?.name).filter(Boolean),
      broken,
      aliasedCollections: [
        ...new Set(aliases.map((alias) => alias?.collection_name).filter(Boolean) as string[]),
      ],
    };
  },
};

export default action;
