import type { ActionDefinition } from "@w6w/types";
import { RecruitClient } from "../lib/client.ts";
import { candidateFields } from "../lib/fields.ts";
import { fieldBody, fieldParams } from "../lib/params.ts";

const candidateCreate: ActionDefinition<Record<string, unknown>> = {
  key: "candidate-create",
  type: "perform",
  resource: "candidate",
  title: "Create Candidate",
  description:
    "Create a candidate (`POST /v1/candidates`, sent as multipart/form-data as the spec " +
    "declares). Resume and avatar uploads are not supported.",
  idempotent: false,
  params: fieldParams(candidateFields),
  output: [
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    const form = fieldBody(candidateFields, input);
    if (Object.keys(form).length === 0) throw new Error("at least one candidate field is required");
    return new RecruitClient(ctx).json("/candidates", { method: "POST", form });
  },
};

export default candidateCreate;
