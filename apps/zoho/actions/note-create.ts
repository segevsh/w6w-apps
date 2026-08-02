import type { ActionDefinition } from "@w6w/types";
import {
  moduleName,
  unwrapRecordResult,
  ZohoClient,
  type ZohoRecordResult,
} from "../lib/client.ts";
import { writeOutput } from "../lib/params.ts";

interface Input {
  module: string;
  recordId: string;
  noteTitle?: string;
  noteContent: string;
}

/**
 * `POST /{module}/{id}/Notes` — nested under the parent record, so Zoho infers
 * the association without needing the flat `/Notes` endpoint's `Parent_Id` /
 * `se_module` fields.
 */
const noteCreate: ActionDefinition<Input, ZohoRecordResult> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Attach a Note to a Lead, Contact, Deal or Account.",
  idempotent: false,
  params: [
    {
      key: "module",
      label: "Module",
      type: "select",
      required: true,
      options: [
        { value: "Leads", label: "Lead" },
        { value: "Contacts", label: "Contact" },
        { value: "Deals", label: "Deal" },
        { value: "Accounts", label: "Account" },
      ],
    },
    { key: "recordId", label: "Record ID", type: "string", required: true },
    { key: "noteTitle", label: "Note title", type: "string" },
    { key: "noteContent", label: "Note content", type: "text", required: true },
  ],
  output: writeOutput,

  execute(input, ctx) {
    return new ZohoClient(ctx)
      .request<{ data: ZohoRecordResult[] }>(
        `/${moduleName(input.module)}/${encodeURIComponent(input.recordId)}/Notes`,
        {
          method: "POST",
          body: { data: [{ Note_Title: input.noteTitle, Note_Content: input.noteContent }] },
        },
      )
      .then(unwrapRecordResult);
  },
};

export default noteCreate;
