import type { ActionDefinition } from "@w6w/types";
import { QdrantClient } from "../lib/client.ts";

/**
 * `POST /collections/aliases` — move an alias, atomically.
 *
 * ## This is the zero-downtime re-index
 *
 * The pattern: build `documents_v2` while `documents` still points at
 * `documents_v1`, verify it, then point `documents` at `documents_v2` in one
 * operation. Qdrant applies the whole batch atomically, so there is no instant
 * where the alias resolves to nothing and no reader sees a gap.
 *
 * Creating an alias that already exists **moves** it rather than failing, which
 * is exactly what this pattern needs and is worth knowing before relying on an
 * error to prevent a mistake — there will not be one.
 *
 * ## The old collection is still there afterwards
 *
 * Moving the alias does not delete anything. That is the point — it makes the
 * switch reversible for as long as the old collection exists — and it is also
 * how a cluster quietly fills with `documents_v1` through `documents_v7`.
 * Deleting the old one is a separate, deliberate act.
 */
const action: ActionDefinition = {
  key: "alias-update",
  type: "perform",
  resource: "collection",
  title: "Point an alias at a collection",
  description:
    "Move an alias atomically — the zero-downtime re-index. An existing alias is MOVED rather " +
    "than rejected, and the old collection stays until somebody deletes it.",
  idempotent: true,
  params: [
    {
      key: "alias",
      label: "Alias",
      type: "string",
      required: true,
      default: "",
      hint: "The stable name readers query.",
    },
    {
      key: "collection",
      label: "Collection",
      type: "string",
      required: true,
      default: "",
      hint: "The collection it should point at from now on.",
    },
    {
      key: "deleteOthers",
      label: "Remove the alias from elsewhere first",
      type: "boolean",
      default: true,
      hint: "Included in the same atomic batch, so there is no instant where the alias resolves " +
        "to nothing.",
    },
  ],
  output: [
    { key: "alias", type: "string", label: "The alias" },
    { key: "collection", type: "string", label: "What it now points at" },
    { key: "moved", type: "boolean", label: "Applied" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const alias = String(p.alias ?? "").trim();
    const collection = String(p.collection ?? "").trim();
    if (!alias) throw new Error("`alias` is required");
    if (!collection) throw new Error("`collection` is required");

    const actions: unknown[] = [];
    // Both in one batch — Qdrant applies them atomically, so no reader sees a gap.
    if (p.deleteOthers === undefined || p.deleteOthers === true) {
      actions.push({ delete_alias: { alias_name: alias } });
    }
    actions.push({
      create_alias: { collection_name: collection, alias_name: alias },
    });

    await new QdrantClient(ctx).request("/collections/aliases", {
      method: "POST",
      body: { actions },
    });

    ctx.log("info", "pointed a Qdrant alias at a collection", { alias, collection });
    return { alias, collection, moved: true };
  },
};

export default action;
