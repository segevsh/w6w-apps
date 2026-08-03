import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  columns: Array<{ id: string; fields?: Record<string, unknown> }>;
}

interface Output {
  columns: Array<{ id: string }>;
}

/**
 * `POST /docs/{docId}/tables/{tableId}/columns`.
 *
 * The `fields` vocabulary, taken from the endpoint's own worked examples:
 *
 * | field           | meaning                                                       |
 * | --------------- | ------------------------------------------------------------- |
 * | `label`         | Display name. The id stays what you asked for                  |
 * | `type`          | `Text` · `Int` · `Numeric` · `Bool` · `Date` · `DateTime` · `Choice` · `Ref:<TableId>` |
 * | `formula`       | A Python expression, e.g. `$A + $B`                            |
 * | `isFormula`     | `true` for a real formula column; `false` makes `formula` a default for new rows |
 * | `widgetOptions` | A JSON **string**, not an object — e.g. `Choice` choices and their colours |
 * | `visibleCol`    | For `Ref:` columns, the colRef of the column to display        |
 *
 * Two of those are easy to get wrong and are called out in the hint:
 * `widgetOptions` is a *stringified* JSON blob nested inside JSON, and
 * `isFormula` is what separates a computed column from a default value — the
 * same `formula` field carries both.
 */
const addColumns: ActionDefinition<Input, Output> = {
  key: "add-columns",
  type: "perform",
  resource: "column",
  title: "Add Columns",
  description: "Add one or more columns to a table, including formula and reference columns.",
  // A second call with the same id creates a suffixed column, not a no-op.
  idempotent: false,
  params: [
    { key: "docId", label: "Document ID", type: "string", required: true },
    { key: "tableId", label: "Table ID", type: "string", required: true },
    {
      key: "columns",
      label: "Columns",
      type: "json",
      required: true,
      hint: 'Array of {"id": "popularity", "fields": {"label": "Popularity", "type": "Int"}}. ' +
        "Types: Text, Int, Numeric, Bool, Date, DateTime, Choice, Ref:<TableId>. " +
        '`widgetOptions` must be a JSON STRING, e.g. "{\\"choices\\":[\\"New\\",\\"Old\\"]}". ' +
        "Set `isFormula: true` for a computed column; with `isFormula: false` a `formula` becomes " +
        "the default value for new rows instead.",
    },
  ],
  output: [
    { key: "columns", type: "array", label: "Created columns (assigned ids)" },
  ],

  execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    return client.request<Output>(
      `/docs/${encodeURIComponent(input.docId)}/tables/${
        encodeURIComponent(input.tableId)
      }/columns`,
      { method: "POST", body: { columns: input.columns ?? [] } },
    );
  },
};

export default addColumns;
