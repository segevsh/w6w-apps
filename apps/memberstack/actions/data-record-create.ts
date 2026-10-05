import type { ActionDefinition } from "@w6w/types";
import { compact, MemberstackClient } from "../lib/client.ts";
import { requireObject, tableKeyParam } from "../lib/params.ts";

/**
 * `POST /v2/data-tables/:tableKey/records` with `{ data, memberId? }`.
 *
 * The page's request-body table and its axios example both nest the fields under `data`
 * (its curl samples show them flat; the stated contract, "data — object, Required", is used).
 * `memberId` makes that member the record's owner (needed for `AUTHENTICATED_OWN` tables);
 * an unknown member answers 404 "Member not found". DECIMAL fields come back as strings.
 */
interface Input {
  tableKey: string;
  data: unknown;
  memberId?: string;
}

const dataRecordCreate: ActionDefinition<Input> = {
  key: "data-record-create",
  type: "perform",
  resource: "data-record",
  title: "Create Data Record",
  description: "Create a record in a Data Table, optionally owned by a member.",
  idempotent: false,
  params: [
    tableKeyParam,
    {
      key: "data",
      label: "Data",
      type: "json",
      required: true,
      hint: "Field key → value. REFERENCE fields take a record id; REFERENCE_MANY an array of ids.",
    },
    {
      key: "memberId",
      label: "Owner member ID",
      type: "string",
      hint: 'Optional. Without it the record shows as created by "System".',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "tableKey", type: "string", label: "Table key" },
    { key: "data", type: "object", label: "Record data" },
    { key: "createdByMemberId", type: "string", label: "Owner member ID" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
    { key: "internalOrder", type: "number", label: "Internal order (pagination cursor)" },
  ],

  async execute(input, ctx) {
    return await new MemberstackClient(ctx).json(
      `/v2/data-tables/${encodeURIComponent(input.tableKey)}/records`,
      {
        method: "POST",
        body: compact({ data: requireObject(input.data, "data"), memberId: input.memberId }),
      },
    );
  },
};

export default dataRecordCreate;
