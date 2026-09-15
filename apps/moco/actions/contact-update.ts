import type { ActionDefinition } from "@w6w/types";
import { compact, MocoClient } from "../lib/client.ts";
import { customProperties, parseList } from "../lib/params.ts";

interface Input {
  contactId: number;
  firstname?: string;
  lastname?: string;
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
  tags?: string[] | string;
  customProperties?: unknown;
}

/**
 * `PATCH /contacts/people/{id}` — verified against `docs.mocoapp.com/api/docs/v1.yaml`, which
 * documents this endpoint as accepting the identical payload shape as create ("Payload used for
 * creating/updating contact people"). Only fields the caller sets are sent, so an untouched field
 * keeps its current value.
 */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact person. Only the fields provided are changed.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    { key: "firstname", label: "First name", type: "string", row: "name" },
    { key: "lastname", label: "Last name", type: "string", row: "name" },
    { key: "companyId", label: "Company ID", type: "number" },
    { key: "workEmail", label: "Work email", type: "string", row: "work" },
    { key: "workPhone", label: "Work phone", type: "string", row: "work" },
    { key: "mobilePhone", label: "Mobile phone", type: "string" },
    { key: "jobPosition", label: "Job position", type: "string", advanced: true },
    { key: "gender", label: "Gender", type: "string", advanced: true },
    { key: "title", label: "Title", type: "string", advanced: true },
    { key: "salutation", label: "Salutation", type: "string", advanced: true },
    { key: "workAddress", label: "Work address", type: "text", advanced: true },
    { key: "homeEmail", label: "Home email", type: "string", advanced: true },
    { key: "homeAddress", label: "Home address", type: "text", advanced: true },
    { key: "birthday", label: "Birthday", type: "date", advanced: true },
    { key: "info", label: "Notes", type: "text", advanced: true },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated list of tag names. Replaces the existing tag set.",
    },
    {
      key: "customProperties",
      label: "Custom properties",
      type: "json",
      advanced: true,
      hint: "Merged with existing custom properties; only submitted keys are updated.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
  ],

  execute(input, ctx) {
    return new MocoClient(ctx).request(`/contacts/people/${input.contactId}`, {
      method: "PATCH",
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
        tags: parseList(input.tags),
        custom_properties: customProperties(input.customProperties),
      }),
    });
  },
};

export default contactUpdate;
