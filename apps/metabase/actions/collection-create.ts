import type { ActionDefinition } from "@w6w/types";
import { compact, MetabaseClient } from "../lib/client.ts";
import { collectionOutput } from "../lib/params.ts";

/**
 * `POST /api/collection` — create a collection.
 *
 * Only `name` is required (the endpoint's schema marks exactly one member
 * required). Omitting `parent_id` creates the collection at the root. Verified
 * live: `{"name":"Probe Coll","description":"probe"}` returned a collection with
 * `id: 5`, `slug: "probe_coll"` and `location: "/"` — the root.
 *
 * ## `location` is derived, not supplied
 *
 * The response carries a `location` like `/3/7/` — the slash-delimited path of
 * ancestor ids. It is computed by Metabase from `parent_id` and is **not** an
 * input; there is no `location` member in the request schema. It is worth
 * knowing about because it is the field to read when reconstructing the tree
 * from a flat `collection-list`.
 *
 * ## `authorityLevel` is an enterprise feature and is offered anyway
 *
 * `authority_level: "official"` marks a collection Official (the yellow badge).
 * On Metabase OSS the field is accepted and ignored rather than rejected, so
 * offering it costs nothing and quietly does nothing on an instance without the
 * licence. The hint says so, which is better than a caller wondering why the
 * badge never appears.
 *
 * `idempotent: false` — Metabase allocates a new id on every call and does not
 * deduplicate by name. Two runs make two identically-named collections.
 */
interface Input {
  name: string;
  description?: string;
  parentId?: number;
  authorityLevel?: string;
  namespace?: string;
}

const collectionCreate: ActionDefinition<Input> = {
  key: "collection-create",
  type: "perform",
  resource: "collection",
  title: "Create Collection",
  description: "Create a collection, optionally nested inside another.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "parentId",
      label: "Parent collection ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Leave empty to create at the root.",
    },
    {
      key: "authorityLevel",
      label: "Authority level",
      type: "select",
      options: [
        { value: "official", label: "Official", description: "Shows the Official badge." },
      ],
      hint:
        "An enterprise feature. Metabase OSS accepts the field and ignores it, so the badge will " +
        "simply not appear on an instance without the licence.",
    },
    {
      key: "namespace",
      label: "Namespace",
      type: "string",
      hint: "Leave empty for the default namespace, which is where questions and dashboards live.",
    },
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new MetabaseClient(ctx).request("/api/collection", {
      method: "POST",
      body: {
        name: input.name,
        ...compact({
          description: input.description,
          parent_id: input.parentId,
          authority_level: input.authorityLevel,
          namespace: input.namespace,
        }),
      },
    });
  },
};

export default collectionCreate;
