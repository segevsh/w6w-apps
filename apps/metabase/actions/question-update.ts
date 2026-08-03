import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, MetabaseClient } from "../lib/client.ts";
import { cardOutput } from "../lib/params.ts";

/**
 * `PUT /api/card/{id}` — update a saved question, including archiving it.
 *
 * ## It is a PUT that behaves like a PATCH
 *
 * The endpoint declares **no required fields** — every member of its body schema
 * is optional — and it applies exactly the keys present, leaving the rest alone.
 * So `{"archived": true}` is a complete, valid request; it does not blank the
 * name and the query on the way past. Verified live: archiving question 40 with
 * that single-key body returned the question intact with `archived: true` and
 * its `name` unchanged.
 *
 * `lib/client.ts`'s `compact` is what makes this safe from the caller's side: a
 * param the user left blank is dropped from the body entirely rather than sent
 * as `""`, so an unedited field cannot overwrite a real value with an empty one.
 *
 * ## Why `archived` is a param and not a separate "archive" action
 *
 * Because un-archiving exists and is the same call with `false`. Splitting it
 * into `question-archive` / `question-unarchive` would double the surface to
 * express one boolean. It is deliberately typed `boolean` rather than folded
 * into `compact`'s blank-dropping — `compact` keeps `false`, precisely so that
 * un-archiving is expressible.
 *
 * **Archiving is not deleting.** Metabase moves archived items to Trash, from
 * which they can be restored; there is a separate `DELETE /api/card/{id}`. That
 * one is not shipped — see the README's "not implemented" list for why.
 *
 * ## Idempotency
 *
 * `idempotent: true`. Applying the same field values twice converges on the same
 * state, so a retrying workflow is safe. (Metabase does bump `updated_at` and
 * write a revision entry each time, which is bookkeeping rather than a
 * semantic difference.)
 */
interface Input {
  cardId: number | string;
  name?: string;
  description?: string;
  datasetQuery?: unknown;
  display?: string;
  collectionId?: number;
  archived?: boolean;
  visualizationSettings?: unknown;
}

const questionUpdate: ActionDefinition<Input> = {
  key: "question-update",
  type: "perform",
  resource: "question",
  title: "Update Question",
  description:
    "Update a saved question's name, description, query, collection or archived state. Only the " +
    "fields you supply are changed.",
  idempotent: true,
  params: [
    {
      key: "cardId",
      label: "Question ID",
      type: "string",
      required: true,
    },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "datasetQuery",
      label: "Query",
      type: "json",
      hint: "Replaces the question's query definition wholesale.",
    },
    { key: "display", label: "Visualisation", type: "string" },
    {
      key: "collectionId",
      label: "Collection ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Move the question into this collection.",
    },
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      hint:
        "True moves the question to Trash; false restores it. Archiving is reversible and is not " +
        "deletion.",
    },
    { key: "visualizationSettings", label: "Visualisation settings", type: "json" },
  ],
  output: cardOutput,

  execute(input, ctx) {
    const body: Record<string, unknown> = {};
    // Built key-by-key rather than through `compact`, because `archived: false`
    // must survive: it is how a question is restored from Trash, and a
    // blank-dropping helper that also dropped `false` would make un-archiving
    // impossible to express.
    if (input.name) body.name = input.name;
    if (input.description !== undefined && input.description !== "") {
      body.description = input.description;
    }
    if (input.display) body.display = input.display;
    if (input.collectionId !== undefined && input.collectionId !== null) {
      body.collection_id = input.collectionId;
    }
    if (typeof input.archived === "boolean") body.archived = input.archived;

    const query = asOptionalJson<Record<string, unknown>>(input.datasetQuery, "Query");
    if (query !== undefined) body.dataset_query = query;

    const viz = asOptionalJson<Record<string, unknown>>(
      input.visualizationSettings,
      "Visualisation settings",
    );
    if (viz !== undefined) body.visualization_settings = viz;

    return new MetabaseClient(ctx).request(
      `/api/card/${encodeURIComponent(String(input.cardId))}`,
      { method: "PUT", body },
    );
  },
};

export default questionUpdate;
