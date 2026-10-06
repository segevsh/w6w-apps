import type { ActionDefinition } from "@w6w/types";
import { FireberryClient, jsonValue, seg } from "../lib/client.ts";
import { OBJECT_PARAM } from "../lib/params.ts";

interface Input {
  object: string;
  recordId: string;
  fields: Record<string, unknown> | string;
}

/** `PUT /api/record/{object}/{id}`. */
const recordUpdate: ActionDefinition<Input> = {
  key: "record-update",
  type: "perform",
  resource: "record",
  title: "Update Record",
  description: "Update fields on an existing record of any object, addressed by its GUID.",
  idempotent: true,
  params: [
    OBJECT_PARAM,
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The record's GUID.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: "Object of system field name to new value.",
    },
  ],
  output: [{ key: "record", type: "object", label: "The updated record" }],

  async execute(input, ctx) {
    const fields = jsonValue(input.fields);
    if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
      throw new Error("fields must be a JSON object of system field name to value");
    }
    const body = await new FireberryClient(ctx).request<{ data?: { Record?: unknown } }>(
      "PUT",
      `/api/record/${seg(input.object)}/${seg(input.recordId)}`,
      { body: fields },
    );
    return { record: body.data?.Record ?? null };
  },
};

export default recordUpdate;
