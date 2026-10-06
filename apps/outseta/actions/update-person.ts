import type { ActionDefinition } from "@w6w/types";
import { buildBody, OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  personUid: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneMobile?: string;
  phoneWork?: string;
  title?: string;
  timezone?: string;
  language?: string;
  properties?: unknown;
}

/** `PUT /api/v1/crm/people/{personUid}` — Update one or more properties on a person. Only the properties you send change. */
const updatePerson: ActionDefinition<Input> = {
  key: "update-person",
  type: "perform",
  resource: "person",
  title: "Update Person",
  description: "Update one or more properties on a person. Only the properties you send change.",
  idempotent: true,
  params: [
    {
      key: "personUid",
      label: "Person Uid",
      type: "string",
      hint: "The person's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
    {
      key: "email",
      label: "Email",
      type: "string",
    },
    {
      key: "firstName",
      label: "First name",
      type: "string",
    },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
    },
    {
      key: "phoneMobile",
      label: "Mobile phone",
      type: "string",
    },
    {
      key: "phoneWork",
      label: "Work phone",
      type: "string",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
    },
    {
      key: "timezone",
      label: "Time zone",
      type: "string",
    },
    {
      key: "language",
      label: "Language",
      type: "string",
    },
    {
      key: "properties",
      label: "Additional properties",
      type: "json",
      advanced: true,
      hint:
        "Extra Outseta properties (including custom ones) as a JSON object, merged into the body exactly as they appear on a GET. The typed fields above win on a clash.",
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/crm/people/${pathId(input.personUid)}`, {
      method: "PUT",
      body: buildBody({
        Email: input.email,
        FirstName: input.firstName,
        LastName: input.lastName,
        PhoneMobile: input.phoneMobile,
        PhoneWork: input.phoneWork,
        Title: input.title,
        Timezone: input.timezone,
        Language: input.language,
      }, input.properties),
    });
  },
};

export default updatePerson;
