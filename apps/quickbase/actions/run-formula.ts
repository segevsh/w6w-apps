import type { ActionDefinition } from "@w6w/types";
import { QuickbaseClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  formula: string;
  recordId?: number;
}

interface Output {
  result?: string;
}

/**
 * `POST /formula/run`.
 *
 * Evaluates a Quickbase formula without there being a formula field on the
 * table to hold it — the platform's own expression language, on demand. Useful
 * when a workflow needs a value that Quickbase already knows how to compute
 * (a business-day calculation, a role check, a formula the app already defines)
 * and duplicating that logic in the workflow would mean two definitions
 * drifting apart.
 *
 * `recordId` sets the record the formula evaluates against, which is what makes
 * field references like `[Price]` resolve. A formula with no field references
 * does not need one.
 *
 * The result always comes back as a **string**, whatever the formula's type —
 * a numeric formula yields `"42"`, not `42`.
 */
const runFormula: ActionDefinition<Input, Output> = {
  key: "run-formula",
  type: "read",
  resource: "formula",
  title: "Run Formula",
  description:
    "Evaluate a Quickbase formula against a record without needing a formula field. Result is always a string.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    {
      key: "formula",
      label: "Formula",
      type: "code",
      required: true,
      placeholder: "[Price] * [Quantity]",
      hint: "Quickbase formula syntax. Field references resolve against the record ID below.",
    },
    {
      key: "recordId",
      label: "Record ID",
      type: "number",
      hint: "The record to evaluate against. Required if the formula references fields.",
    },
  ],
  output: [{ key: "result", type: "string", label: "Result (always a string)" }],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<Output>("formula/run", {
      method: "POST",
      body: {
        from: input.tableId,
        formula: input.formula,
        rid: input.recordId,
      },
    });
  },
};

export default runFormula;
