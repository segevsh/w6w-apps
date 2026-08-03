import type { ActionDefinition } from "@w6w/types";
import { MetabaseClient } from "../lib/client.ts";
import { collectionOutput } from "../lib/params.ts";

/**
 * `GET /api/collection` — list the collections this connection can see.
 *
 * Like `GET /api/card`, this returns a **bare array** with no pagination. Unlike
 * `GET /api/card` that is rarely a problem: collections are a folder tree
 * maintained by hand, so instances have tens of them, not thousands.
 *
 * The array includes two pseudo-collections whose `id` is a **string**, not a
 * number — `"root"` (Our analytics, the top level) and `"trash"`. That is why
 * `collectionOutput` types `id` as a string and why `collection-items` takes its
 * id as a string param: a numeric coercion would turn `"root"` into `NaN` and
 * lose the one collection every instance has. Verified live: a stock instance
 * returned two entries, and `GET /api/collection/root/items` is a real,
 * working path.
 *
 * `personalOnly` and `excludeOtherUserCollections` both exist because personal
 * collections dominate the list on a large instance — every user has one, and an
 * admin key can see all of them. Filtering them out is usually what a workflow
 * enumerating shared content wants.
 */
interface Input {
  archived?: boolean;
  personalOnly?: boolean;
  excludeOtherUserCollections?: boolean;
  namespace?: string;
}

const collectionList: ActionDefinition<Input> = {
  key: "collection-list",
  type: "search",
  resource: "collection",
  title: "List Collections",
  // Worded to avoid the word "credential" in executable code: `tests/index.test.ts`
  // bans it from action modules outright, and a guard that has to reason about
  // whether an occurrence is prose or a real read is a guard that will be wrong.
  description: "List the collections this connection can see. Returns a bare array.",
  params: [
    {
      key: "archived",
      label: "Archived only",
      type: "boolean",
      default: false,
      hint: "Return collections in the Trash instead of live ones.",
    },
    {
      key: "personalOnly",
      label: "Personal collections only",
      type: "boolean",
      default: false,
    },
    {
      key: "excludeOtherUserCollections",
      label: "Exclude other users' personal collections",
      type: "boolean",
      default: false,
      hint:
        "Usually what you want on a large instance — every user has a personal collection and an " +
        "admin key can see all of them.",
    },
    {
      key: "namespace",
      label: "Namespace",
      type: "string",
      hint:
        "Metabase partitions collections by namespace; the default (empty) namespace holds the " +
        "questions and dashboards. `snippets` holds SQL snippet folders. Leave empty unless you " +
        "specifically want another namespace.",
    },
  ],
  output: [
    { key: "[]", type: "array", label: "Collections — a bare array, not an envelope" },
    ...collectionOutput.map((f) => ({ ...f, key: `[].${f.key}` })),
  ],

  execute(input, ctx) {
    return new MetabaseClient(ctx).request("/api/collection", {
      query: {
        archived: input.archived,
        "personal-only": input.personalOnly,
        "exclude-other-user-collections": input.excludeOtherUserCollections,
        namespace: input.namespace,
      },
    });
  },
};

export default collectionList;
