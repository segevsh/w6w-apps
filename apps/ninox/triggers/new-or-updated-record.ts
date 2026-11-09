import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/record-list.ts";

interface Params {
  moduleName: string;
  tableName: string;
}

function requiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string") {
    throw new Error(`new-or-updated-record: ${key} must be a string`);
  }
  return value;
}

const pollAction: ActionDefinition = {
  ...action,
  execute(input, ctx) {
    return action.execute({
      moduleName: requiredString(input, "moduleName"),
      tableName: requiredString(input, "tableName"),
      sort: typeof input.sort === "string" ? input.sort : undefined,
      limit: typeof input.limit === "number" ? input.limit : undefined,
      offset: typeof input.offset === "number" ? input.offset : undefined,
    }, ctx);
  },
};

const trigger = pollFromListAction<Params>({
  key: "new-or-updated-record",
  title: "New or Updated Record",
  description:
    "The run gets each table record that is created or modified, newest modification first. Fires once per modification.",
  action: pollAction,
  params: [{ key: "moduleName", label: "Module", type: "string", required: true }, {
    key: "tableName",
    label: "Table",
    type: "string",
    required: true,
  }],
  input: ({ moduleName, tableName }) => ({
    moduleName,
    tableName,
    sort: "-_md",
    limit: 100,
    offset: 0,
  }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => {
    const record = item as { id?: unknown; _md?: unknown; values?: { _md?: unknown } };
    // `_md` is the last-modified stamp; one id fires once per modification.
    return `${String(record.id)}:${String(record._md ?? record.values?._md ?? "")}`;
  },
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "values", type: "object", label: "Field values" },
  ],
  sample: { id: "record-1", values: { _md: "2026-11-09T10:00:00.000Z" } },
  maxPages: 1,
});

export default trigger;
