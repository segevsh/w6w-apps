import type { ActionDefinition } from "@w6w/types";
import { jsonObject } from "../lib/client.ts";
import { API, identifier, peopleCall } from "../lib/people.ts";
import { formLinkName } from "../lib/params.ts";

export interface RecordCreateInput {
  formLinkName: string;
  fields: unknown;
  isDraft?: boolean;
}

const recordCreate: ActionDefinition<RecordCreateInput> = {
  key: "record-create",
  type: "perform",
  resource: "record",
  title: "Create Record",
  description:
    "Add a record to any form. `fields` is keyed by the form's field LABEL names (see Get Form Fields); tabular-section values are JSON arrays.",
  idempotent: false,
  params: [
    formLinkName,
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Label name -> value, e.g. { "FirstName": "Ada", "LastName": "Lovelace" }.',
    },
    { key: "isDraft", label: "Save as draft", type: "boolean" },
  ],
  output: [
    { key: "pkId", type: "string", label: "Id of the created record" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const fields = jsonObject(input.fields, "fields");
    const { result, message } = await peopleCall(
      ctx,
      `${API}/forms/json/${identifier(input.formLinkName)}/insertRecord`,
      {
        method: "POST",
        form: {
          inputData: JSON.stringify(fields),
          isDraft: input.isDraft === undefined ? undefined : String(input.isDraft),
        },
      },
    );
    const r = (result ?? {}) as { pkId?: string };
    return { pkId: r.pkId ?? null, message };
  },
};

export default recordCreate;
