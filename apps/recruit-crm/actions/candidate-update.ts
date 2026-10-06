import type { ActionDefinition } from "@w6w/types";
import { encodeId, RecruitClient } from "../lib/client.ts";
import { candidateFields } from "../lib/fields.ts";
import { fieldBody, fieldParams, slugParam } from "../lib/params.ts";

const candidateUpdate: ActionDefinition<Record<string, unknown>> = {
  key: "candidate-update",
  type: "perform",
  resource: "candidate",
  title: "Update Candidate",
  description: "Edit a candidate (`POST /v1/candidates/{id}` — Recruit CRM edits with POST, as " +
    "multipart/form-data). Only the fields you fill in are sent.",
  idempotent: true,
  params: [slugParam("candidateId", "Candidate id", "candidate"), ...fieldParams(candidateFields)],
  output: [
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    const id = encodeId(input.candidateId);
    const form = fieldBody(candidateFields, input);
    if (Object.keys(form).length === 0) throw new Error("at least one field to change is required");
    return new RecruitClient(ctx).json(`/candidates/${id}`, { method: "POST", form });
  },
};

export default candidateUpdate;
