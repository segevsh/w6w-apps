import type { ActionDefinition } from "@w6w/types";
import { MODULE_PARAM, NinoxClient, seg, TABLE_PARAM } from "../lib/client.ts";

/** `GET .../tables/{tableName}/fields/{fieldName}`. */
interface Input {
  moduleName: string;
  tableName: string;
  fieldName: string;
}

interface Output {
  field: unknown;
}

const fieldGet: ActionDefinition<Input, Output> = {
  key: "field-get",
  type: "read",
  resource: "field",
  title: "Get Field",
  description: "Read one field's definition.",
  params: [
    MODULE_PARAM,
    TABLE_PARAM,
    { key: "fieldName", label: "Field name", type: "string", required: true },
  ],
  output: [{ key: "field", type: "object", label: "Field" }],

  async execute(input, ctx) {
    const client = new NinoxClient(ctx);
    return {
      field: await client.data(`${client.tablePath(input)}/fields/${seg(input.fieldName)}`),
    };
  },
};

export default fieldGet;
