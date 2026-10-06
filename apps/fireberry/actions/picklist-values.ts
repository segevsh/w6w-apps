import type { ActionDefinition } from "@w6w/types";
import { FireberryClient, seg } from "../lib/client.ts";
import { OBJECT_NUMBER_PARAM } from "../lib/params.ts";

interface Input {
  objectNumber: number;
  fieldName: string;
}

/** `GET /metadata/records/{id}/fields/{fieldname}/values`. */
const picklistValues: ActionDefinition<Input> = {
  key: "picklist-values",
  type: "read",
  resource: "field",
  title: "Get Picklist Values",
  description:
    "List a picklist field's options as name/value pairs. Records store the numeric value, so read this before writing a status, type or stage.",
  params: [
    OBJECT_NUMBER_PARAM,
    {
      key: "fieldName",
      label: "Picklist field system name",
      type: "string",
      required: true,
      placeholder: "statuscode",
    },
  ],
  output: [
    { key: "field", type: "object", label: "The field's metadata" },
    { key: "values", type: "array", label: "Options: name, value" },
  ],

  async execute(input, ctx) {
    const body = await new FireberryClient(ctx).request<
      { data?: { values?: unknown[] } & Record<string, unknown> }
    >(
      "GET",
      `/metadata/records/${seg(input.objectNumber)}/fields/${seg(input.fieldName)}/values`,
    );
    const data = body.data ?? {};
    return { field: data, values: data.values ?? [] };
  },
};

export default picklistValues;
