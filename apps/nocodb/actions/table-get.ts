import type { ActionDefinition } from "@w6w/types";
import { NocoDBClient } from "../lib/client.ts";

/**
 * `GET /api/v2/meta/tables/{tableId}` — the columns, which is what a write has
 * to satisfy.
 *
 * ## Column types decide what a write may contain
 *
 * A `SingleSelect` accepts only its declared options; a `Date` wants an ISO
 * string; a `Formula` and a `Rollup` are computed and cannot be written at
 * all. Sending a value to one of those is rejected in terms of the column, not
 * the rule — so this action separates the writable columns from the rest.
 *
 * ## Link fields have ids, and `link-list` needs them
 *
 * A `LinkToAnotherRecord` column is where the relationships live, and every
 * link action takes the column's **id** rather than its title. This is where
 * that id comes from, and it is the reason to call this before wiring up
 * anything relational.
 *
 * ## The primary key is not always `Id`
 *
 * NocoDB creates one called `Id`; a base built on an existing database uses
 * whatever that database has. `record-update` and `record-delete` take the
 * column name for exactly this reason, and this reports it.
 */
const action: ActionDefinition = {
  key: "table-get",
  type: "read",
  resource: "table",
  title: "Get a table's schema",
  description:
    "The columns a write has to satisfy. Separates WRITABLE columns from computed ones — a " +
    "formula or rollup is rejected in terms of the column rather than the rule — reports the " +
    "select options, and gives the LINK FIELD IDS the link actions need.",
  params: [
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "table", type: "object", label: "The table" },
    { key: "title", type: "string", label: "Its name" },
    { key: "columns", type: "array", label: "Every column, with what may be done to it" },
    { key: "writableColumns", type: "array", label: "Columns a record payload may carry" },
    { key: "computedColumns", type: "array", label: "Formulas and rollups — read-only" },
    { key: "linkFields", type: "array", label: "Link columns, with the ids `link-list` takes" },
    { key: "selectOptions", type: "object", label: "The values a select column will accept" },
    { key: "primaryKey", type: "string", label: "The column the record actions key on" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");

    const table = await new NocoDBClient(ctx).request<{
      id?: string;
      title?: string;
      columns?: Array<{
        id?: string;
        title?: string;
        uidt?: string;
        pk?: boolean;
        system?: boolean;
        colOptions?: { options?: Array<{ title?: string }> };
      }>;
    }>(`/api/v2/meta/tables/${encodeURIComponent(tableId)}`);

    const columns = table?.columns ?? [];
    // Computed and system columns cannot appear in a write.
    const computedTypes = new Set(["Formula", "Rollup", "Lookup", "Barcode", "QrCode", "Count"]);
    const linkTypes = new Set(["LinkToAnotherRecord", "Links"]);

    const selectOptions: Record<string, string[]> = {};
    for (const column of columns) {
      const options = column?.colOptions?.options;
      if (options?.length && column?.title) {
        selectOptions[column.title] = options.map((option) => String(option?.title ?? ""));
      }
    }

    const primary = columns.find((column) => column?.pk === true);

    return {
      table,
      title: table?.title,
      columns: columns.map((column) => ({
        id: column?.id,
        title: column?.title,
        type: column?.uidt,
        isPrimaryKey: column?.pk === true,
        isComputed: computedTypes.has(String(column?.uidt)),
        isLink: linkTypes.has(String(column?.uidt)),
      })),
      writableColumns: columns
        .filter((column) =>
          !computedTypes.has(String(column?.uidt)) && !linkTypes.has(String(column?.uidt)) &&
          column?.system !== true && column?.pk !== true
        )
        .map((column) => column?.title)
        .filter(Boolean),
      computedColumns: columns
        .filter((column) => computedTypes.has(String(column?.uidt)))
        .map((column) => column?.title)
        .filter(Boolean),
      // The link actions take the id, and everybody has the title.
      linkFields: columns
        .filter((column) => linkTypes.has(String(column?.uidt)))
        .map((column) => ({ id: column?.id, title: column?.title })),
      selectOptions,
      primaryKey: primary?.title ?? "Id",
    };
  },
};

export default action;
