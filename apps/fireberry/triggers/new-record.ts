import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import queryRecords from "../actions/query-records.ts";

interface Row {
  _id?: unknown;
}

function extraFields(value: unknown): Array<{ name: string }> {
  let parsed = value;
  if (typeof value === "string" && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value.split(",");
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((
      field,
    ) => (typeof field === "string" ? field.trim() : (field as { name?: unknown })?.name))
    .filter((name): name is string =>
      typeof name === "string" && name !== "" && name !== "createdon"
    )
    .map((name) => ({ name }));
}

/**
 * Fireberry's v3 query orders by any field (`orderBy: [{name, order: "asc"|"desc"}]`, documented at
 * https://developers.fireberry.com/docs/queries-v3.md) and its examples query the `createdon`
 * field, so newest-first is an explicit `createdon` descending sort — never the default order,
 * which the docs say is the primary key.
 */
const trigger: TriggerDefinition<{ objectType: number; fields?: unknown }> = {
  key: "new-record",
  title: "New Record",
  description:
    "The run gets each record newly created in one Fireberry object (account, contact, custom object, …).",
  params: [
    {
      key: "objectType",
      label: "Object number",
      type: "number",
      required: true,
      hint: "Numeric object type code (account is 1).",
      validation: { min: 1, integer: true },
    },
    {
      key: "fields",
      label: "Extra fields",
      type: "json",
      hint: 'Fields to include besides `createdon`, e.g. ["accountname","emailaddress1"].',
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Record ID" },
    { key: "createdon", type: "string", label: "Created on" },
  ],
  sample: {
    _id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    createdon: "2026-11-09T12:00:00Z",
    accountname: "Acme",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    return await pollNewItems<Row>({
      state,
      maxPages: 1,
      maxEvents: 100,
      seenWindow: 200,
      idOf: (row) => String(row._id ?? ""),
      async fetchPage() {
        const out = await queryRecords.execute!({
          objectType: Number(params.objectType),
          fields: [{ name: "createdon" }, ...extraFields(params.fields)],
          orderBy: [{ name: "createdon", order: "desc" }],
          pageSize: 100,
        }, ctx) as { records?: Row[] };
        const rows = Array.isArray(out?.records) ? out.records : [];
        return { items: rows.filter((row) => String(row._id ?? "") !== "") };
      },
    });
  },
};

export default trigger;
