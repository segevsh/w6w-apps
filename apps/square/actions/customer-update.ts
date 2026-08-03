import type { ActionDefinition } from "@w6w/types";
import { jsonObject, SquareClient, unset } from "../lib/client.ts";

interface Input {
  customerId: string;
  givenName?: string;
  familyName?: string;
  companyName?: string;
  nickname?: string;
  emailAddress?: string;
  phoneNumber?: string;
  referenceId?: string;
  note?: string;
  birthday?: string;
  address?: unknown;
  version?: number;
}

/**
 * `PUT /v2/customers/{customer_id}` (UpdateCustomer).
 *
 * A sparse update despite the PUT: only the fields you send change. Blank
 * params are dropped rather than sent as empty strings, so leaving a field
 * alone in the editor leaves it alone on the profile. (Square clears a field
 * when you send an explicit JSON `null`; this action has no way to express that
 * for the scalar fields, deliberately — an accidental blank must not wipe a
 * customer's email.)
 *
 * `version` is optimistic concurrency: pass the version you read and Square
 * rejects the write if the profile changed underneath you. Not required, and
 * not defaulted, because guessing it would defeat the point.
 *
 * Not `idempotent`: this endpoint takes no idempotency key, and a blind retry
 * of a sparse update is only safe if nothing else wrote in between — which is
 * exactly what `version` exists to detect.
 */
const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description:
    "Sparsely update a customer profile — only the fields you fill in are changed. Optionally version-checked.",
  idempotent: false,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    { key: "givenName", label: "First name", type: "string" },
    { key: "familyName", label: "Last name", type: "string" },
    { key: "companyName", label: "Company", type: "string" },
    { key: "nickname", label: "Nickname", type: "string" },
    { key: "emailAddress", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone", type: "string" },
    {
      key: "birthday",
      label: "Birthday",
      type: "string",
      hint: "`YYYY-MM-DD`, or `MM-DD` to omit the year.",
      validation: { pattern: "^([0-9]{4}-)?[0-9]{2}-[0-9]{2}$" },
    },
    { key: "referenceId", label: "Reference ID", type: "string" },
    { key: "note", label: "Note", type: "text" },
    { key: "address", label: "Address", type: "json", hint: "A Square Address object." },
    {
      key: "version",
      label: "Version",
      type: "number",
      hint:
        "The `version` you read from the profile. Square rejects the write if it has changed since — leave empty to skip the check.",
      validation: { min: 0, integer: true },
    },
  ],
  output: [
    { key: "customer", type: "object", label: "Updated customer" },
    { key: "errors", type: "array", label: "Errors reported alongside a 2xx" },
  ],

  execute(input, ctx) {
    return new SquareClient(ctx).request(
      `/customers/${encodeURIComponent(input.customerId)}`,
      {
        method: "PUT",
        body: {
          given_name: unset(input.givenName),
          family_name: unset(input.familyName),
          company_name: unset(input.companyName),
          nickname: unset(input.nickname),
          email_address: unset(input.emailAddress),
          phone_number: unset(input.phoneNumber),
          reference_id: unset(input.referenceId),
          note: unset(input.note),
          birthday: unset(input.birthday),
          address: jsonObject(input.address, "address"),
          version: input.version,
        },
      },
    );
  },
};

export default customerUpdate;
