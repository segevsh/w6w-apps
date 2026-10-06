import type { ActionDefinition } from "@w6w/types";
import { FireberryClient, seg } from "../lib/client.ts";
import { OBJECT_NUMBER_PARAM } from "../lib/params.ts";

interface Input {
  objectNumber: number;
  fieldName: string;
}

/** `GET /metadata/records/{id}/fields/{fieldname}`. */
const fieldGet: ActionDefinition<Input> = {
  key: "field-get",
  type: "read",
  resource: "field",
  title: "Get Field",
  description: "Read one field's metadata by its system field name.",
  params: [
    OBJECT_NUMBER_PARAM,
    {
      key: "fieldName",
      label: "Field system name",
      type: "string",
      required: true,
      placeholder: "accountname",
    },
  ],
  output: [{ key: "field", type: "object", label: "label, fieldName, systemFieldTypeId, …" }],

  async execute(input, ctx) {
    const body = await new FireberryClient(ctx).request<{ data?: unknown }>(
      "GET",
      `/metadata/records/${seg(input.objectNumber)}/fields/${seg(input.fieldName)}`,
    );
    return { field: body.data ?? null };
  },
};

export default fieldGet;
