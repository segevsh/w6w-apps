import type { ActionDefinition } from "@w6w/types";
import { FireberryClient, jsonValue, seg } from "../lib/client.ts";
import { OBJECT_PARAM } from "../lib/params.ts";

interface Input {
  object: string;
  fields: Record<string, unknown> | string;
}

/** `POST /api/record/{object}`. */
const recordCreate: ActionDefinition<Input> = {
  key: "record-create",
  type: "perform",
  resource: "record",
  title: "Create Record",
  description:
    'Create a record in any object. Fields are a JSON object keyed by system field name, e.g. {"accountname": "Acme", "emailaddress1": "a@acme.test"}.',
  idempotent: false,
  params: [
    OBJECT_PARAM,
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint:
        "Object of system field name to value. Picklists take their numeric value, lookups take a GUID. The object's primary field (accountname, firstname/lastname on contact, subject on task…) is usually required.",
    },
  ],
  output: [{ key: "record", type: "object", label: "The created record, including its new ID" }],

  async execute(input, ctx) {
    const fields = jsonValue(input.fields);
    if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
      throw new Error("fields must be a JSON object of system field name to value");
    }
    const body = await new FireberryClient(ctx).request<{ data?: { Record?: unknown } }>(
      "POST",
      `/api/record/${seg(input.object)}`,
      { body: fields },
    );
    return { record: body.data?.Record ?? null };
  },
};

export default recordCreate;
