import type { ActionDefinition } from "@w6w/types";
import { compact, MocoClient } from "../lib/client.ts";
import { customProperties, parseList } from "../lib/params.ts";

interface Input {
  firstname: string;
  lastname: string;
  gender?: string;
  title?: string;
  jobPosition?: string;
  mobilePhone?: string;
  workEmail?: string;
  workPhone?: string;
  workAddress?: string;
  homeEmail?: string;
  homeAddress?: string;
  birthday?: string;
  salutation?: string;
  info?: string;
  companyId?: number;
  userId?: number;
  tags?: string[] | string;
  customProperties?: unknown;
}

/**
 * `POST /contacts/people` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. The OpenAPI
 * schema itself marks no property required (only that a JSON body must be sent), but every worked
 * example pairs `firstname` and `lastname` and MOCO's UI treats a name as mandatory for a person
 * record, so both are required here to avoid silently creating an unnamed contact.
 */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact person, optionally attached to a company.",
  idempotent: false,
  params: [
    { key: "firstname", label: "First name", type: "string", required: true, row: "name" },
    { key: "lastname", label: "Last name", type: "string", required: true, row: "name" },
    { key: "companyId", label: "Company ID", type: "number" },
    { key: "workEmail", label: "Work email", type: "string", row: "work" },
    { key: "workPhone", label: "Work phone", type: "string", row: "work" },
    { key: "mobilePhone", label: "Mobile phone", type: "string" },
    { key: "jobPosition", label: "Job position", type: "string", advanced: true },
    { key: "gender", label: "Gender", type: "string", advanced: true },
    { key: "title", label: "Title", type: "string", advanced: true, hint: "e.g. Dr." },
    { key: "salutation", label: "Salutation", type: "string", advanced: true },
    { key: "workAddress", label: "Work address", type: "text", advanced: true },
    { key: "homeEmail", label: "Home email", type: "string", advanced: true },
    { key: "homeAddress", label: "Home address", type: "text", advanced: true },
    { key: "birthday", label: "Birthday", type: "date", advanced: true },
    { key: "info", label: "Notes", type: "text", advanced: true },
    { key: "userId", label: "MOCO user ID", type: "number", advanced: true },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated list of tag names.",
    },
    {
      key: "customProperties",
      label: "Custom properties",
      type: "json",
      advanced: true,
      hint: '{ "LinkedIn": "https://linkedin.com/in/..." }',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
  ],

  execute(input, ctx) {
    return new MocoClient(ctx).request("/contacts/people", {
      method: "POST",
      body: compact({
        firstname: input.firstname,
        lastname: input.lastname,
        gender: input.gender,
        title: input.title,
        job_position: input.jobPosition,
        mobile_phone: input.mobilePhone,
        work_email: input.workEmail,
        work_phone: input.workPhone,
        work_address: input.workAddress,
        home_email: input.homeEmail,
        home_address: input.homeAddress,
        birthday: input.birthday,
        salutation: input.salutation,
        info: input.info,
        company_id: input.companyId,
        user_id: input.userId,
        tags: parseList(input.tags),
        custom_properties: customProperties(input.customProperties),
      }),
    });
  },
};

export default contactCreate;
