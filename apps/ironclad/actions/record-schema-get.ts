import type { ActionDefinition } from "@w6w/types";
import { IroncladClient } from "../lib/client.ts";

type Input = Record<string, never>;

const recordSchemaGet: ActionDefinition<Input> = {
  key: "record-schema-get",
  type: "read",
  resource: "record",
  title: "Get Record Schema",
  description:
    "List the record types and every property (id, display name, type) the repository defines. Use it to build the `properties` for Create Record.",
  params: [],
  output: [{ key: "recordTypes", type: "object", label: "Record types" }, {
    key: "properties",
    type: "object",
    label: "Property definitions",
  }],

  execute(_input, ctx) {
    return new IroncladClient(ctx).json("/records/metadata");
  },
};

export default recordSchemaGet;
