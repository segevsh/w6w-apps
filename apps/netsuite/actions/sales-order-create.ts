import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  jsonObject,
  NetSuiteClient,
  parseJson,
  recordPath,
  writeResult,
} from "../lib/client.ts";
import { additionalFieldsParam, ref, writeOutput } from "../lib/params.ts";

interface Input {
  customer: string;
  lines: unknown;
  memo?: string;
  location?: string;
  externalId?: string;
  additionalFields?: unknown;
}

/**
 * Create a `salesOrder`. The awkward part of this record over REST is the sublist nesting: the
 * lines go under `item.items`, each with `item: {id}` (shape verified in Oracle's "Error Handling
 * in REST Web Services" example, which posts `{"entity":{"id":107},"location":{"id":1},
 * "item":{"items":[{"item":{"id":9999},"amount":1}]}}`). This action builds that nesting from a
 * plain list of lines and passes each line through untouched, so any line field the record
 * schema defines is available.
 */
const salesOrderCreate: ActionDefinition<Input> = {
  key: "sales-order-create",
  type: "perform",
  resource: "salesOrder",
  title: "Create Sales Order",
  description: "Create a sales order for a customer from a list of lines.",
  idempotent: false,
  params: [
    { key: "customer", label: "Customer ID", type: "string", required: true },
    {
      key: "lines",
      label: "Lines",
      type: "json",
      required: true,
      hint: 'A JSON array, one object per line: `[{"item":{"id":"9999"},"amount":1}]`. Each ' +
        "object may carry any field the sales order line schema defines.",
    },
    { key: "memo", label: "Memo", type: "string" },
    { key: "location", label: "Location ID", type: "string" },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Optional; lets you address the order as `eid:<id>` later.",
    },
    additionalFieldsParam,
  ],
  output: writeOutput,

  async execute(input, ctx) {
    const lines = parseJson(input.lines, "lines");
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new Error("`lines` must be a non-empty JSON array.");
    }
    const body = {
      ...compact({
        entity: ref(input.customer),
        memo: input.memo,
        location: input.location ? ref(input.location) : undefined,
        externalId: input.externalId,
      }),
      item: { items: lines },
      ...jsonObject(input.additionalFields, "additionalFields"),
    };
    const client = new NetSuiteClient(ctx);
    return writeResult(await client.request(recordPath("salesOrder"), { method: "POST", body }));
  },
};

export default salesOrderCreate;
