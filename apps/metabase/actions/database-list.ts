import type { ActionDefinition } from "@w6w/types";
import { MetabaseClient } from "../lib/client.ts";
import { databaseOutput } from "../lib/params.ts";

/**
 * `GET /api/database` — list the databases registered in Metabase.
 *
 * This is the discovery step for `query-run`: the `database` id an ad-hoc query
 * needs comes from here. Verified live: the response is `{"data": [...],
 * "total": N}` — an envelope, unlike the bare arrays that `card`, `collection`
 * and `dashboard` return, but **without** `limit`/`offset`, so it does not
 * paginate either.
 *
 * `engine` on each entry is the driver name (`postgres`, `bigquery-cloud-sdk`,
 * `snowflake`, `h2`, …) and `features` is the driver's capability list. The
 * latter is worth reading before writing a native query, because it is where
 * things like `parameterized-sql`, `left-join` and the window-function support
 * are declared per driver — a query using a feature the driver lacks fails at
 * execution rather than at parse time.
 *
 * ## `include: "tables"` is offered but is not the way to browse a schema
 *
 * Setting it inlines every table of every database into this one response. On an
 * instance with a real warehouse attached that is enormous, and it answers a
 * question `database-metadata` answers better for one database at a time. It is
 * exposed because it is genuinely the fastest way to snapshot a small instance,
 * with a hint saying when not to.
 */
interface Input {
  include?: string;
  savedQuestions?: boolean;
}

const databaseList: ActionDefinition<Input> = {
  key: "database-list",
  type: "search",
  resource: "database",
  title: "List Databases",
  description:
    "List the databases registered in Metabase. The `id` of each is what Run Query needs.",
  params: [
    {
      key: "include",
      label: "Include",
      type: "select",
      options: [
        { value: "tables", label: "Tables", description: "Inline every table of every database." },
        { value: "schemas", label: "Schemas", description: "Inline schema names." },
      ],
      hint:
        "Leave empty for just the database records. `tables` can be very large on an instance " +
        "with a real warehouse attached — prefer Get Database Metadata for one database.",
    },
    {
      key: "savedQuestions",
      label: "Include the saved-questions virtual database",
      type: "boolean",
      default: false,
      hint: "Metabase exposes saved questions as a synthetic database so they can be used as a " +
        "query source. Off by default because it is not a real data source.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Databases" },
    ...databaseOutput.map((f) => ({ ...f, key: `data.${f.key}` })),
    { key: "total", type: "number", label: "Count" },
  ],

  execute(input, ctx) {
    return new MetabaseClient(ctx).request("/api/database", {
      query: { include: input.include, saved: input.savedQuestions },
    });
  },
};

export default databaseList;
