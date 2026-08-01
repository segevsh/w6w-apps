import type { ActionDefinition } from "@w6w/types";
import { DatabricksClient } from "../lib/client.ts";

interface Input {
  statementId: string;
}

/** GET /api/2.0/sql/statements/{statementId} — poll a statement's status and results. */
const sqlStatementGet: ActionDefinition<Input> = {
  key: "sql-statement-get",
  type: "read",
  resource: "sql-statement",
  title: "Get SQL Statement",
  description: "Get a SQL statement's status and results by ID.",
  params: [
    { key: "statementId", label: "Statement ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "object", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new DatabricksClient(ctx);
    return client.request(`/api/2.0/sql/statements/${input.statementId}`);
  },
};

export default sqlStatementGet;
