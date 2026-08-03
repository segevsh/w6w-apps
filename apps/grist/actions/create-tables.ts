import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

interface TableSpec {
  id?: string;
  columns: Array<{ id: string; fields?: Record<string, unknown> }>;
}

interface Input {
  docId: string;
  tables: TableSpec[];
}

interface Output {
  tables: Array<{ id: string }>;
}

/**
 * `POST /docs/{docId}/tables`.
 *
 * `columns` is **required** on every table — Grist has no "create an empty
 * table" through this endpoint. The response returns each table's assigned id,
 * which may not be the one that was asked for: Grist normalizes and de-conflicts
 * table ids, so `My Table` comes back as `My_Table` and a second `People`
 * becomes `People2`. Downstream steps should read the id out of the response
 * rather than reusing the requested one.
 *
 * Column `fields` are the same shape `add-columns` takes — `label`, `type`,
 * `formula`, `isFormula`, `widgetOptions`. See that action for the vocabulary.
 */
const createTables: ActionDefinition<Input, Output> = {
  key: "create-tables",
  type: "perform",
  resource: "table",
  title: "Create Tables",
  description: "Add one or more tables, each with its columns, to a document.",
  // Repeating the call creates a second, suffixed table rather than a no-op.
  idempotent: false,
  params: [
    { key: "docId", label: "Document ID", type: "string", required: true },
    {
      key: "tables",
      label: "Tables",
      type: "json",
      required: true,
      hint:
        'Array of {"id": "People", "columns": [{"id": "pet", "fields": {"label": "Pet", "type": "Text"}}]}. ' +
        "`columns` is required — Grist will not create a table without them. The returned id may " +
        "differ from the requested one (normalized and de-conflicted).",
    },
  ],
  output: [
    { key: "tables", type: "array", label: "Created tables (assigned ids)" },
  ],

  execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    return client.request<Output>(`/docs/${encodeURIComponent(input.docId)}/tables`, {
      method: "POST",
      body: { tables: input.tables ?? [] },
    });
  },
};

export default createTables;
