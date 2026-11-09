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
    throw new Error(`new-record: ${key} must be a string`);
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
  key: "new-record",
  title: "New Record",
  description: "Fires for newly created table records.",
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
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [{ key: "id", type: "string", label: "Record ID" }],
  sample: { id: "record-1", values: {} },
  maxPages: 1,
});

export default trigger;
