import type { ActionDefinition } from "@w6w/types";
import { asObject, asOptionalJson, call, compact } from "../lib/client.ts";

interface Input {
  name?: unknown;
  email?: unknown;
  title?: unknown;
  organization?: unknown;
  source?: unknown;
  linkedinProfile?: unknown;
  fields?: unknown;
}

const candidateAdd: ActionDefinition<Input> = {
  key: "candidate-add",
  type: "perform",
  title: "Add Candidate",
  description: "Create a candidate record.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "email",
      label: "Primary email",
      type: "string",
      hint:
        "Sent as the single primary entry of the `email` array. Pass the `email` key in Additional fields for several.",
    },
    { key: "title", label: "Job title", type: "string" },
    { key: "organization", label: "Current organization", type: "string" },
    { key: "source", label: "Source", type: "string" },
    { key: "linkedinProfile", label: "LinkedIn profile URL", type: "string" },
    {
      key: "fields",
      label: "Additional fields",
      type: "json",
      hint:
        "JSON object of any other candidate fields from the API reference (profile links, education, experience, tags, custom_fields...). Merged into the request body; the named params above win.",
    },
  ],
  output: [{ key: "RESULT", type: "string", label: "Result" }, {
    key: "data",
    type: "object",
    label: "Response data",
  }],

  async execute(input, ctx) {
    const body = {
      ...asOptionalJson<Record<string, unknown>>(input.fields, "Additional fields"),
      ...compact({
        "name": input.name,
        "email": input.email ? [{ email: input.email, is_primary: 1 }] : undefined,
        "title": input.title,
        "organization": input.organization,
        "source": input.source,
        "linkedin_profile": input.linkedinProfile,
      }),
    };
    const res = await call(ctx, "/candidate/add", { method: "POST", body });
    return asObject(res);
  },
};

export default candidateAdd;
