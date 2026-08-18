import type { ActionDefinition } from "@w6w/types";
import { compact, MeilisearchClient } from "../lib/client.ts";
import { TASK_OUTPUT } from "../lib/params.ts";

/**
 * `POST /indexes` — verified against Meilisearch's OpenAPI document
 * (`create_index`).
 *
 * **Name the primary key here or live with a guess.** Left unset, Meilisearch
 * infers it from the first batch of documents — an attribute called `id`, or
 * one ending in `Id` — and the inference is then permanent. Changing it later
 * means deleting the index and rebuilding it, so the cost of naming it now is
 * a field and the cost of not naming it is a migration.
 *
 * Like every write, this returns a task; the index does not exist the instant
 * the call returns.
 */
const action: ActionDefinition = {
  key: "index-create",
  type: "perform",
  resource: "index",
  title: "Create an index",
  description: "Enqueue creation of an index, ideally with an explicit primary key.",
  // Meilisearch fails the task for a duplicate uid rather than reusing it.
  idempotent: false,
  params: [
    {
      key: "indexUid",
      label: "Index UID",
      type: "string",
      required: true,
      default: "",
      placeholder: "movies",
      hint: "Letters, numbers, hyphens and underscores.",
      validation: { pattern: "^[A-Za-z0-9_-]+$" },
    },
    {
      key: "primaryKey",
      label: "Primary Key",
      type: "string",
      default: "",
      hint: "Strongly recommended. Left blank, Meilisearch GUESSES from the first documents " +
        "and the guess cannot be changed without rebuilding the index.",
    },
  ],
  output: TASK_OUTPUT,

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uid = String(p.indexUid ?? "").trim();
    if (!uid) throw new Error("`indexUid` is required");

    ctx.log("info", "enqueueing a Meilisearch index creation", {
      index: uid,
      explicitPrimaryKey: Boolean(String(p.primaryKey ?? "").trim()),
    });

    return await new MeilisearchClient(ctx).request("/indexes", {
      method: "POST",
      body: compact({ uid, primaryKey: p.primaryKey }),
    });
  },
};

export default action;
