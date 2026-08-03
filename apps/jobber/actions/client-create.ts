import type { ActionDefinition } from "@w6w/types";
import { CLIENT_FIELDS, compact, JobberClient, unwrap } from "../lib/client.ts";

interface Input {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  isCompany?: boolean;
  title?: string;
  email?: string;
  emailDescription?: string;
  phone?: string;
  phoneDescription?: string;
  smsAllowed?: boolean;
  street1?: string;
  street2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  receivesReminders?: boolean;
  receivesFollowUps?: boolean;
}

/**
 * `userErrors` is selected on purpose and is not optional decoration: a
 * rejected create arrives as HTTP 200 with `client: null` and the reason in
 * this array. `unwrap` turns that into a thrown error.
 */
const MUTATION = `
  mutation CreateClient($input: ClientCreateInput!) {
    clientCreate(input: $input) {
      client { ${CLIENT_FIELDS} }
      userErrors { message path }
    }
  }
`;

const clientCreate: ActionDefinition<Input> = {
  key: "client-create",
  type: "perform",
  resource: "client",
  title: "Create Client",
  description:
    "Create a client, optionally with a primary email, phone and one service property. Fails loudly on Jobber's `userErrors`.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    {
      key: "companyName",
      label: "Company name",
      type: "string",
      hint: "Set together with `Is a company` to store the client as a business.",
    },
    {
      key: "isCompany",
      label: "Is a company",
      type: "boolean",
      hint: "Use the company name as the client's primary name.",
    },
    {
      key: "title",
      label: "Title",
      type: "select",
      options: [
        { value: "MR", label: "Mr" },
        { value: "MS", label: "Ms" },
        { value: "MRS", label: "Mrs" },
        { value: "MISS", label: "Miss" },
        { value: "DR", label: "Dr" },
      ],
      advanced: true,
    },
    { key: "email", label: "Email address", type: "string", row: "email" },
    {
      key: "emailDescription",
      label: "Email type",
      type: "select",
      default: "MAIN",
      options: [
        { value: "MAIN", label: "Main" },
        { value: "WORK", label: "Work" },
        { value: "PERSONAL", label: "Personal" },
        { value: "OTHER", label: "Other" },
      ],
      row: "email",
    },
    { key: "phone", label: "Phone number", type: "string", row: "phone" },
    {
      key: "phoneDescription",
      label: "Phone type",
      type: "select",
      default: "MAIN",
      options: [
        { value: "MAIN", label: "Main" },
        { value: "MOBILE", label: "Mobile" },
        { value: "WORK", label: "Work" },
        { value: "HOME", label: "Home" },
        { value: "FAX", label: "Fax" },
        { value: "OTHER", label: "Other" },
      ],
      row: "phone",
    },
    {
      key: "smsAllowed",
      label: "SMS allowed",
      type: "boolean",
      hint: "Whether Jobber may text this number (appointment reminders, review requests).",
      advanced: true,
    },
    {
      key: "street1",
      label: "Street",
      type: "string",
      hint:
        "Filling any address field creates the client's first service property. Jobber requires an address on a property, so a partial address still becomes a property record.",
      row: "addr1",
    },
    { key: "street2", label: "Street 2", type: "string", row: "addr1", advanced: true },
    { key: "city", label: "City", type: "string", row: "addr2" },
    { key: "province", label: "State / province", type: "string", row: "addr2" },
    { key: "postalCode", label: "Postal code", type: "string", row: "addr3" },
    { key: "country", label: "Country", type: "string", row: "addr3" },
    {
      key: "receivesReminders",
      label: "Receives visit reminders",
      type: "boolean",
      advanced: true,
    },
    { key: "receivesFollowUps", label: "Receives job follow-ups", type: "boolean", advanced: true },
  ],
  output: [{ key: "client", type: "object", label: "The created client" }],

  async execute(input, ctx) {
    const address = compact({
      street1: input.street1,
      street2: input.street2,
      city: input.city,
      province: input.province,
      postalCode: input.postalCode,
      country: input.country,
    });

    const data = await new JobberClient(ctx).query<Record<string, unknown>>(MUTATION, {
      input: compact({
        firstName: input.firstName,
        lastName: input.lastName,
        companyName: input.companyName,
        isCompany: input.isCompany,
        title: input.title,
        receivesReminders: input.receivesReminders,
        receivesFollowUps: input.receivesFollowUps,
        emails: input.email
          ? [{
            address: input.email,
            description: input.emailDescription ?? "MAIN",
            primary: true,
          }]
          : undefined,
        phones: input.phone
          ? [compact({
            number: input.phone,
            description: input.phoneDescription ?? "MAIN",
            smsAllowed: input.smsAllowed,
            primary: true,
          })]
          : undefined,
        properties: Object.keys(address).length ? [{ address }] : undefined,
      }),
    });

    return unwrap(data, "clientCreate");
  },
};

export default clientCreate;
