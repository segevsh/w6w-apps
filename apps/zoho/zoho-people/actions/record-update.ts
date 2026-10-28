import type { ActionDefinition } from "@w6w/types";
import { jsonObject } from "../lib/client.ts";
import { API, identifier, peopleCall } from "../lib/people.ts";
import { formLinkName } from "../lib/params.ts";

export interface RecordUpdateInput {
  formLinkName: string;
  recordId: string;
  fields: unknown;
  tabularData?: unknown;
  isDraft?: boolean;
}

const recordUpdate: ActionDefinition<RecordUpdateInput> = {
  key: "record-update",
  type: "perform",
  resource: "record",
  title: "Update Record",
  description:
    "Modify field values of an existing record in any form. Get the `recordId` from List Records.",
  idempotent: true,
  params: [
    formLinkName,
    { key: "recordId", label: "Record ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Label name -> new value, e.g. { "Mobile": "555-0100" }.',
    },
    {
      key: "tabularData",
      label: "Tabular data",
      type: "json",
      hint:
        "Optional rows of tabular sections to add, update or delete, as Zoho's tabularData JSON.",
    },
    { key: "isDraft", label: "Save as draft", type: "boolean" },
  ],
  output: [
    { key: "pkId", type: "string", label: "Id of the updated record" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const fields = jsonObject(input.fields, "fields");
    if (!input.recordId) throw new Error("`recordId` is required.");
    const tabular = input.tabularData === undefined || input.tabularData === null ||
        input.tabularData === ""
      ? undefined
      : typeof input.tabularData === "string"
      ? input.tabularData
      : JSON.stringify(input.tabularData);
    const { result, message } = await peopleCall(
      ctx,
      `${API}/forms/json/${identifier(input.formLinkName)}/updateRecord`,
      {
        method: "POST",
        form: {
          recordId: input.recordId,
          inputData: JSON.stringify(fields),
          tabularData: tabular,
          isDraft: input.isDraft === undefined ? undefined : String(input.isDraft),
        },
      },
    );
    const r = (result ?? {}) as { pkId?: string };
    return { pkId: r.pkId ?? input.recordId, message };
  },
};

export default recordUpdate;
