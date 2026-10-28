import type { ActionDefinition } from "@w6w/types";
import {
  GraphClient,
  rangeSegment,
  segment,
  sessionHeaders,
  workbookPath,
  type WorkbookRef,
} from "../lib/client.ts";
import { addressParam, sessionIdParam, workbookParams, worksheetParam } from "../lib/params.ts";

interface Input extends WorkbookRef {
  worksheet: string;
  address: string;
  applyTo?: string;
  sessionId?: string;
}

/**
 * `POST …/workbook/worksheets/{id|name}/range(address='…')/clear`
 *
 * https://learn.microsoft.com/en-us/graph/api/range-clear
 *
 * `applyTo` selects what gets cleared: `All`, `Formats`, or `Contents`. The
 * parameter is documented as optional; it is defaulted to `Contents` here
 * because "clear this range" almost always means the data rather than the
 * styling, and the alternative silently discarding a sheet's formatting is the
 * worse surprise.
 *
 * The reference states `200 OK` in its Response section while its own example
 * shows `204 No Content`. Either is accepted — the action reports whichever
 * status came back rather than asserting one.
 *
 * Idempotent: clearing an already-clear range is a no-op.
 */
const clearRange: ActionDefinition<Input, { status: number }> = {
  key: "clear-range",
  type: "perform",
  resource: "range",
  title: "Clear Range",
  description: "Clear a range's contents, its formatting, or both.",
  idempotent: true,
  params: [
    ...workbookParams(),
    worksheetParam(),
    addressParam(true, "A1-style address, e.g. `A2:D100`."),
    {
      key: "applyTo",
      label: "Clear",
      type: "select",
      default: "Contents",
      options: [
        { value: "Contents", label: "Contents — values and formulas only" },
        { value: "Formats", label: "Formats — styling only" },
        { value: "All", label: "All — contents and formats" },
      ],
    },
    sessionIdParam,
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx): Promise<{ status: number }> {
    const client = new GraphClient(ctx);
    const path = `${workbookPath(input)}/worksheets/${segment(input.worksheet)}` +
      rangeSegment(input.address) + "/clear";

    return await client.status(path, {
      method: "POST",
      body: { applyTo: input.applyTo ?? "Contents" },
      headers: sessionHeaders(input.sessionId),
    });
  },
};

export default clearRange;
