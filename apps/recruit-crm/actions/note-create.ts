import type { ActionDefinition } from "@w6w/types";
import { compact, RecruitClient } from "../lib/client.ts";

interface Input {
  description: string;
  relatedTo: string;
  relatedToType: string;
  noteTypeId?: number;
}

const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Add a note to a candidate, company, contact, job or deal (`POST /v1/notes`).",
  idempotent: false,
  params: [
    { key: "description", label: "Note", type: "text", required: true },
    {
      key: "relatedTo",
      label: "Related record id",
      type: "string",
      required: true,
      hint: "Numeric id (slug) of the record the note is attached to.",
    },
    {
      key: "relatedToType",
      label: "Related record type",
      type: "select",
      required: true,
      options: ["candidate", "company", "contact", "job", "deal"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "noteTypeId",
      label: "Note type id",
      type: "number",
      hint: "From the vendor's Note Types list (`GET /v1/note-types`, not wrapped here).",
    },
  ],
  output: [
    { key: "description", type: "string", label: "Note" },
    { key: "related_to", type: "string", label: "Related record id" },
  ],

  execute(input, ctx) {
    if (!input.description?.trim()) throw new Error("description is required");
    if (!String(input.relatedTo ?? "").trim()) throw new Error("relatedTo is required");
    if (!input.relatedToType) throw new Error("relatedToType is required");
    return new RecruitClient(ctx).json("/notes", {
      method: "POST",
      body: compact({
        description: input.description,
        related_to: String(input.relatedTo).trim(),
        related_to_type: input.relatedToType,
        note_type_id: input.noteTypeId,
      }),
    });
  },
};

export default noteCreate;
