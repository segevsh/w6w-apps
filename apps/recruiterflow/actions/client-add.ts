import type { ActionDefinition } from "@w6w/types";
import { asObject, asOptionalJson, call, compact, toInt } from "../lib/client.ts";

interface Input {
  name?: unknown;
  domain?: unknown;
  phoneNumber?: unknown;
  linkedinPage?: unknown;
  careersPage?: unknown;
  statusId?: unknown;
  industryId?: unknown;
  leadOwnerId?: unknown;
  fields?: unknown;
}

const clientAdd: ActionDefinition<Input> = {
  key: "client-add",
  type: "perform",
  title: "Add Client",
  description: "Create a client company.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "domain", label: "Domain", type: "string" },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    { key: "linkedinPage", label: "LinkedIn page", type: "string" },
    { key: "careersPage", label: "Careers page", type: "string" },
    { key: "statusId", label: "Status ID", type: "number" },
    { key: "industryId", label: "Industry ID", type: "number" },
    { key: "leadOwnerId", label: "Lead owner (user ID)", type: "number" },
    {
      key: "fields",
      label: "Additional fields",
      type: "json",
      hint:
        "JSON object of any other client fields from the API reference (profile links, education, experience, tags, custom_fields...). Merged into the request body; the named params above win.",
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
        "domain": input.domain,
        "phone_number": input.phoneNumber,
        "linkedin_page": input.linkedinPage,
        "careers_page": input.careersPage,
        "status_id": toInt(input.statusId, "Status ID"),
        "industry_id": toInt(input.industryId, "Industry ID"),
        "lead_owner_id": toInt(input.leadOwnerId, "Lead owner (user ID)"),
      }),
    };
    const res = await call(ctx, "/client/add", { method: "POST", body });
    return asObject(res);
  },
};

export default clientAdd;
