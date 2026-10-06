import type { ActionDefinition } from "@w6w/types";
import { FireberryClient, seg } from "../lib/client.ts";
import { OBJECT_NUMBER_PARAM } from "../lib/params.ts";

interface Input {
  objectNumber: number;
}

/** `GET /metadata/records/{id}/fields`. */
const fieldList: ActionDefinition<Input> = {
  key: "field-list",
  type: "search",
  resource: "field",
  title: "Get Object Fields",
  description:
    "List an object's fields: label, system field name, field type ID and, for lookups, the related object. Use the system names in record and query calls.",
  params: [OBJECT_NUMBER_PARAM],
  output: [
    {
      key: "fields",
      type: "array",
      label: "Fields: label, fieldName, systemFieldTypeId, fieldObjectType, systemName",
    },
  ],

  async execute(input, ctx) {
    const body = await new FireberryClient(ctx).request<{ data?: unknown }>(
      "GET",
      `/metadata/records/${seg(input.objectNumber)}/fields`,
    );
    const data = body.data;
    // The reference documents a single object here but the endpoint lists fields; accept both.
    const fields = Array.isArray(data) ? data : data ? [data] : [];
    return { fields };
  },
};

export default fieldList;
