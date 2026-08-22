import type { ActionDefinition } from "@w6w/types";
import { NocoDBClient } from "../lib/client.ts";

/**
 * `GET /api/v2/meta/bases` — the bases this token can reach.
 *
 * ## A base is not always NocoDB's own database
 *
 * NocoDB stores its own bases and it also **connects to external ones** —
 * Postgres, MySQL, SQL Server — presenting existing tables as a spreadsheet.
 * The API is identical either way, and the consequences of writing are not: a
 * `record-delete` against an external base deletes from the customer's
 * production database, through whatever constraints and triggers it has.
 *
 * Nothing in a record response says which kind of base it came from. This
 * action is where that is visible.
 *
 * ## The token's reach is its creator's reach
 *
 * An API token has no scope of its own — it sees the bases the person who made
 * it can see, with their role in each. So this is the action that answers
 * "what can this credential touch", and the answer is often more than intended.
 */
const action: ActionDefinition = {
  key: "base-list",
  type: "search",
  resource: "base",
  title: "List bases",
  description:
    "The bases this token reaches — which is whatever its creator reaches, since a NocoDB token " +
    "has no scope of its own. Flags bases backed by an EXTERNAL DATABASE, where a delete goes " +
    "through to the customer's production Postgres.",
  params: [
    {
      key: "nameContains",
      label: "Name contains",
      type: "string",
      default: "",
    },
  ],
  output: [
    { key: "bases", type: "array", label: "The bases" },
    { key: "count", type: "number", label: "How many this token reaches" },
    { key: "titles", type: "array", label: "Just the names" },
    { key: "ids", type: "array", label: "Their ids, which `table-list` takes" },
    { key: "externalBases", type: "array", label: "Backed by somebody's own database" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const body = await new NocoDBClient(ctx).request<{
      list?: Array<{
        id?: string;
        title?: string;
        type?: string;
        is_meta?: boolean;
        created_at?: string;
      }>;
    }>("/api/v2/meta/bases");

    const all = body?.list ?? [];
    const needle = String(p.nameContains ?? "").trim().toLowerCase();
    const bases = needle
      ? all.filter((base) => String(base?.title ?? "").toLowerCase().includes(needle))
      : all;

    // `is_meta` marks NocoDB's own storage; anything else is a real database.
    const externalBases = bases
      .filter((base) => base?.is_meta === false)
      .map((base) => base?.title)
      .filter(Boolean);

    if (externalBases.length) {
      ctx.log(
        "info",
        "some of these bases are backed by an external database, so writes and deletes go " +
          "through to it rather than to NocoDB's own storage",
        { count: externalBases.length },
      );
    }

    return {
      bases: bases.map((base) => ({
        id: base?.id,
        title: base?.title,
        isExternal: base?.is_meta === false,
        createdAt: base?.created_at,
      })),
      count: bases.length,
      titles: bases.map((base) => base?.title).filter(Boolean),
      ids: bases.map((base) => base?.id).filter(Boolean),
      externalBases,
    };
  },
};

export default action;
