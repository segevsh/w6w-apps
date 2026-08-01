import type { ActionDefinition } from "@w6w/types";
import { DatabricksClient } from "../lib/client.ts";

interface Input {
  warehouseId: string;
  statement: string;
  catalog?: string;
  schema?: string;
}

/**
 * POST /api/2.0/sql/statements — submits a SQL statement to a SQL warehouse.
 *
 * Modeled honestly on Databricks' real async contract (verified against
 * n8n's `databricksSql/executeQuery.operation.ts`): the API can answer
 * synchronously within `wait_timeout` (this action uses the documented
 * maximum, `50s`) or, for longer-running queries, return `status.state:
 * "PENDING"`/`"RUNNING"` with a `statement_id` to poll via
 * `sql-statement-get`. This action always returns whatever Databricks
 * answers with — including a still-pending state — rather than polling
 * internally, since a single Action execution has no good way to block for
 * an unbounded amount of time.
 */
const sqlStatementExecute: ActionDefinition<Input> = {
  key: "sql-statement-execute",
  type: "perform",
  resource: "sql-statement",
  title: "Execute SQL Statement",
  description: "Run a SQL statement against a SQL warehouse. May return PENDING/RUNNING for long queries — poll with Get SQL Statement.",
  idempotent: false,
  params: [
    { key: "warehouseId", label: "Warehouse ID", type: "string", required: true },
    { key: "statement", label: "SQL statement", type: "text", required: true },
    { key: "catalog", label: "Catalog", type: "string" },
    { key: "schema", label: "Schema", type: "string" },
  ],
  output: [
    { key: "statement_id", type: "string", label: "Statement ID" },
    { key: "status", type: "object", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new DatabricksClient(ctx);
    const body: Record<string, unknown> = {
      warehouse_id: input.warehouseId,
      statement: input.statement,
      wait_timeout: "50s",
      on_wait_timeout: "CONTINUE",
    };
    if (input.catalog !== undefined) body.catalog = input.catalog;
    if (input.schema !== undefined) body.schema = input.schema;

    return client.request("/api/2.0/sql/statements", { method: "POST", body });
  },
};

export default sqlStatementExecute;
