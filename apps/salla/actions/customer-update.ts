import type { ActionDefinition } from "@w6w/types";
import { buildBody, SallaClient, seg, toArray } from "../lib/client.ts";

interface Input {
  customer_id: number;
  first_name?: string;
  last_name?: string;
  mobile?: string;
  mobile_code_country?: string;
  email?: string;
  gender?: "male" | "female";
  birthday?: string;
  groups?: string | number | Array<string | number>;
  additionalFields?: unknown;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description:
    "Update a customer. Only the fields you send change. Needs the `customers.read_write` scope.",
  idempotent: true,
  params: [
    {
      "key": "customer_id",
      "label": "Customer ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "first_name",
      "label": "First name",
      "type": "string",
    },
    {
      "key": "last_name",
      "label": "Last name",
      "type": "string",
    },
    {
      "key": "mobile",
      "label": "Mobile",
      "type": "string",
      "hint": "Mobile number without the country prefix. Email and mobile are unique per store.",
    },
    {
      "key": "mobile_code_country",
      "label": "Mobile country code",
      "type": "string",
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
    return client.put(
      `/customers/${seg(input.customer_id)}`,
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

export default customerUpdate;
