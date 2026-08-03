import type { ActionDefinition } from "@w6w/types";
import { idempotencyKey, jsonObject, SquareClient, unset } from "../lib/client.ts";
import { idempotencyKeyParam } from "../lib/params.ts";

/**
 * `CreateCustomerRequest.idempotency_key` carries no `maxLength` in Square's
 * spec. The generic idempotency guidance documents 45 characters as the ceiling
 * for the keys it does bound, so that floor is applied here rather than
 * assuming the field is unbounded — a UUID invocation id (36) fits comfortably.
 */
const MAX_IDEMPOTENCY_KEY = 45;

interface Input {
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
  idempotencyKey?: string;
}

/**
 * `POST /v2/customers` (CreateCustomer).
 *
 * Square requires at least one of given name, family name, company name, email
 * or phone — all five are individually optional, so the check is enforced here
 * rather than by `required: true` on any one param. Failing locally gives a
 * usable message instead of Square's generic `INVALID_REQUEST_ERROR`.
 *
 * `idempotency_key` is OPTIONAL on this endpoint but always sent, because
 * "create a duplicate customer on retry" is never the desired behaviour.
 */
const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description:
    "Create a customer profile. Needs at least one of given name, family name, company name, email or phone.",
  idempotent: true,
  params: [
    { key: "givenName", label: "First name", type: "string" },
    { key: "familyName", label: "Last name", type: "string" },
    { key: "companyName", label: "Company", type: "string" },
    { key: "nickname", label: "Nickname", type: "string" },
    { key: "emailAddress", label: "Email", type: "string" },
    {
      key: "phoneNumber",
      label: "Phone",
      type: "string",
      hint: "9-16 digits. Include a leading + and country code for numbers outside the US.",
    },
    {
      key: "birthday",
      label: "Birthday",
      type: "string",
      hint: "`YYYY-MM-DD`, or `MM-DD` to omit the year.",
      validation: { pattern: "^([0-9]{4}-)?[0-9]{2}-[0-9]{2}$" },
    },
    {
      key: "referenceId",
      label: "Reference ID",
      type: "string",
      hint: "Your own id for this customer in another system.",
    },
    { key: "note", label: "Note", type: "text" },
    {
      key: "address",
      label: "Address",
      type: "json",
      hint:
        'A Square Address object, e.g. {"address_line_1":"500 Electric Ave","locality":"New York","administrative_district_level_1":"NY","postal_code":"10003","country":"US"}.',
    },
    idempotencyKeyParam(MAX_IDEMPOTENCY_KEY),
  ],
  output: [
    { key: "customer", type: "object", label: "Customer" },
    { key: "errors", type: "array", label: "Errors reported alongside a 2xx" },
  ],

  execute(input, ctx) {
    const identifying = [
      input.givenName,
      input.familyName,
      input.companyName,
      input.emailAddress,
      input.phoneNumber,
    ].some((v) => unset(v) !== undefined);
    if (!identifying) {
      throw new Error(
        "Square needs at least one of first name, last name, company, email or phone to create a customer.",
      );
    }

    return new SquareClient(ctx).request("/customers", {
      body: {
        idempotency_key: idempotencyKey(ctx, input.idempotencyKey, MAX_IDEMPOTENCY_KEY),
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
      },
    });
  },
};

export default customerCreate;
