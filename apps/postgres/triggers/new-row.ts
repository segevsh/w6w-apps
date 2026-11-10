import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import query from "../actions/query.ts";

interface Input {
  table: string;
  column: string;
}

function quoteIdentifier(identifier: string): string {
  if (!identifier) throw new Error("Postgres table and monotonic column are required");
  return identifier.split(".").map((part) => `"${part.replaceAll('"', '""')}"`).join(".");
}

const newRow: TriggerDefinition<Input> = {
  key: "new-row",
  title: "New Row",
  description:
    "Poll a table by a monotonic id or timestamp column and emit rows not seen in the last checks.",
  params: [
    { key: "table", label: "Table", type: "string", required: true, placeholder: "public.orders" },
    {
      key: "column",
      label: "Monotonic ID or timestamp column",
      type: "string",
      required: true,
      placeholder: "created_at",
    },
  ],
  output: [{ key: "row", type: "object", label: "New row" }],
  sample: { id: 42, created_at: "2026-11-09T12:00:00Z" },
  async poll({ params, state }, ctx) {
    const sql = `SELECT * FROM ${quoteIdentifier(params.table)} ORDER BY ${
      quoteIdentifier(params.column)
    } DESC LIMIT 100`;
    return await pollNewItems({
      state,
      idOf: (row) => String((row as Record<string, unknown>)[params.column]),
      async fetchPage() {
        const result = await query.execute({ sql }, ctx);
        return { items: result.rows };
      },
    });
  },
};

export default newRow;
