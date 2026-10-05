import type { ActionDefinition } from "@w6w/types";
import { MemberstackClient } from "../lib/client.ts";
import { asObject, recordIdParam, tableKeyParam } from "../lib/params.ts";

/**
 * There is no `GET` for one record; the documented route is the query endpoint with
 * `findUnique` (`where` may hold only `id`). Answers `404 "Record not found"` when absent.
 * REFERENCE_MANY / MEMBER_REFERENCE_MANY includes are available only here, not in findMany.
 */
interface Input {
  tableKey: string;
  recordId: string;
  include?: unknown;
}

const dataRecordGet: ActionDefinition<Input> = {
  key: "data-record-get",
  type: "read",
  resource: "data-record",
  title: "Get Data Record",
  description: "Fetch one record by id (query findUnique), optionally with related records.",
  params: [
    tableKeyParam,
    recordIdParam,
    {
      key: "include",
      label: "Include",
      type: "json",
      placeholder: '{"category": true}',
      hint: "Related fields to embed. Max depth 3, max 10 includes.",
    },
  ],
  output: [{ key: "record", type: "object", label: "The record" }],

  async execute(input, ctx) {
    const include = asObject(input.include, "include");
    const body = await new MemberstackClient(ctx).json<{ data?: { record?: unknown } }>(
      `/v2/data-tables/${encodeURIComponent(input.tableKey)}/records/query`,
      {
        method: "POST",
        body: {
          query: { findUnique: { where: { id: input.recordId }, ...(include ? { include } : {}) } },
        },
      },
    );
    return { record: body?.data?.record ?? null };
  },
};

export default dataRecordGet;
