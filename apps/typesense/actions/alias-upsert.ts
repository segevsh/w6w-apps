import type { ActionDefinition } from "@w6w/types";
import { TypesenseClient } from "../lib/client.ts";

/**
 * `PUT /aliases/{name}` — point a name at a collection.
 *
 * ## This is the swap in a zero-downtime reindex
 *
 * The pattern, in full:
 *
 * 1. `collection-create` a versioned collection — `products_v4`.
 * 2. `document-import` everything into it.
 * 3. **This** — point the `products` alias at `products_v4`.
 * 4. `collection-delete` the old `products_v3`.
 *
 * Between steps 3 and 4 both collections exist and searches are already
 * hitting the new one. No search ever sees a gap, which is not true of
 * deleting and rebuilding in place.
 *
 * ## The swap is the moment to check the new collection is actually populated
 *
 * Nothing in Typesense stops an alias being pointed at an empty collection.
 * The searches keep working, return nothing, and look exactly like a search
 * problem. This action reads the target's document count first and refuses to
 * point at an empty collection unless told to.
 *
 * ## An alias and a collection can share a name, and it goes badly
 *
 * Typesense resolves the collection first. An alias named `products` while a
 * collection called `products` exists is shadowed — searches go to the
 * collection and the alias appears to do nothing.
 */
const action: ActionDefinition = {
  key: "alias-upsert",
  type: "perform",
  resource: "alias",
  title: "Point an alias at a collection",
  description:
    "The swap in a zero-downtime reindex: build a versioned collection, import into it, then " +
    "move the alias. Refuses to point at an EMPTY collection unless told to — searches keep " +
    "working, return nothing, and look like a search problem.",
  idempotent: true,
  params: [
    {
      key: "alias",
      label: "Alias name",
      type: "string",
      required: true,
      default: "",
      placeholder: "products",
      hint: "The stable name searches use. A COLLECTION of the same name shadows it entirely.",
    },
    {
      key: "collection",
      label: "Target collection",
      type: "string",
      required: true,
      default: "",
      placeholder: "products_v4",
    },
    {
      key: "allowEmpty",
      label: "Allow pointing at an empty collection",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "alias", type: "string", label: "The name searches use" },
    { key: "collection", type: "string", label: "What it points at now" },
    { key: "previousCollection", type: "string", label: "What it pointed at before" },
    { key: "changed", type: "boolean", label: "Whether the pointer moved" },
    { key: "targetDocuments", type: "number", label: "How many documents the target holds" },
    {
      key: "shadowedByCollection",
      type: "boolean",
      label: "A collection shares this alias's name",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const alias = String(p.alias ?? "").trim();
    if (!alias) throw new Error("`alias` is required");
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const client = new TypesenseClient(ctx);

    // Pointing at an empty collection is a working search that finds nothing.
    const target = await client.request<{ name?: string; num_documents?: number }>(
      `/collections/${encodeURIComponent(collection)}`,
    );
    const targetDocuments = Number(target?.num_documents ?? 0);
    if (targetDocuments === 0 && p.allowEmpty !== true) {
      throw new Error(
        `${collection} holds no documents. Pointing \`${alias}\` at it leaves every search ` +
          "working and returning nothing, which reads as a search problem rather than a " +
          "deployment one — set `allowEmpty` if the collection is meant to be empty",
      );
    }

    const collections = await client.request<Array<{ name?: string }>>("/collections");
    const shadowedByCollection = (collections ?? []).some((entry) => entry?.name === alias);
    if (shadowedByCollection) {
      ctx.log(
        "warn",
        "a collection already has this alias's name, and Typesense resolves the collection " +
          "first — the alias will appear to do nothing",
        { alias },
      );
    }

    let previousCollection: string | undefined;
    try {
      const existing = await client.request<{ collection_name?: string }>(
        `/aliases/${encodeURIComponent(alias)}`,
      );
      previousCollection = existing?.collection_name;
    } catch {
      // A new alias has no previous target; a 404 here is the normal case.
    }

    const updated = await client.request<{ name?: string; collection_name?: string }>(
      `/aliases/${encodeURIComponent(alias)}`,
      { method: "PUT", body: { collection_name: collection } },
    );

    return {
      alias: updated?.name ?? alias,
      collection: updated?.collection_name ?? collection,
      previousCollection,
      changed: previousCollection !== collection,
      targetDocuments,
      shadowedByCollection,
    };
  },
};

export default action;
