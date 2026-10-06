import type { ActionDefinition } from "@w6w/types";
import { buildBody, SallaClient, toArray } from "../lib/client.ts";

interface Input {
  first_name: string;
  last_name: string;
  mobile: string;
  mobile_code_country: string;
  email?: string;
  gender?: "male" | "female";
  birthday?: string;
  groups?: string | number | Array<string | number>;
  additionalFields?: unknown;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description:
    "Create a customer. Email and mobile number are unique per store. Needs the `customers.read_write` scope.",
  idempotent: false,
  params: [
    {
      "key": "first_name",
      "label": "First name",
      "type": "string",
      "required": true,
    },
    {
      "key": "last_name",
      "label": "Last name",
      "type": "string",
      "required": true,
    },
    {
      "key": "mobile",
      "label": "Mobile",
      "type": "string",
      "required": true,
      "hint": "Mobile number without the country prefix. Email and mobile are unique per store.",
    },
    {
      "key": "mobile_code_country",
      "label": "Mobile country code",
      "type": "string",
      "required": true,
      "hint": "Numeric prefix, e.g. +966.",
    },
    {
      "key": "email",
      "label": "Email",
      "type": "string",
    },
    {
      "key": "gender",
      "label": "Gender",
      "type": "select",
      "options": [
        {
          "value": "male",
          "label": "male",
        },
        {
          "value": "female",
          "label": "female",
        },
      ],
    },
    {
      "key": "birthday",
      "label": "Birthday",
      "type": "string",
      "hint": "Date of birth.",
    },
    {
      "key": "groups",
      "label": "Customer group IDs",
      "type": "string",
      "hint": "Comma-separated or JSON array of customer group IDs.",
    },
    {
      "key": "additionalFields",
      "label": "Additional fields",
      "type": "json",
      "hint":
        "JSON object of any further documented Salla body fields. Fields set above take precedence.",
    },
  ],
  output: [
    {
      "key": "status",
      "type": "number",
      "label": "HTTP status echoed in the envelope",
    },
    {
      "key": "success",
      "type": "boolean",
      "label": "Always true on success",
    },
    {
      "key": "data",
      "type": "object",
      "label": "The record",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.post(
      "/customers",
      buildBody({
        first_name: input.first_name,
        last_name: input.last_name,
        mobile: input.mobile,
        mobile_code_country: input.mobile_code_country,
        email: input.email,
        gender: input.gender,
        birthday: input.birthday,
        groups: toArray(input.groups, "groups"),
      }, input.additionalFields),
    );
  },
};

export default customerCreate;
