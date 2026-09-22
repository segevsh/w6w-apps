import type { Param } from "@w6w/types";

import { asArray, compact } from "./client.ts";

/**
 * The contact write shape, shared by `create-contact` and `update-contact`.
 *
 * Both endpoints take the SAME body — `{ contact: { … } }` — so the field
 * mapping lives here once. The documented contact fields are exactly the ones
 * below (`name`, `emails`, `phones`, `title`, `organization_id`, `skype`,
 * `linkedin`, `facebook`); nothing is invented beyond them.
 *
 * ## Simple value or JSON array
 *
 * The reference models `emails` as an array of `{ email }` and `phones` as an
 * array of `{ phone, type }`. Typing a one-email contact out as JSON every time
 * is hostile, so each has a simple scalar param (`email`, `phone` — plus
 * `phoneType` for the `type` half) *and* a `json`-typed one (`emails`, `phones`)
 * for the multi-value case. When both are supplied the JSON array wins, because
 * it is the more explicit input.
 */
export interface ContactFields {
  name?: string;
  email?: string;
  emails?: unknown;
  phone?: string;
  phoneType?: string;
  phones?: unknown;
  title?: string;
  organizationId?: string;
  skype?: string;
  linkedin?: string;
  facebook?: string;
}

/** The shared param list for both write actions. */
export const contactParams: Param[] = [
  { key: "name", label: "Name", type: "string", hint: "The contact's name." },
  {
    key: "email",
    label: "Email",
    type: "string",
    placeholder: "ada@example.com",
    hint: "Sets `emails` to a single entry. Use Emails (JSON) for more than one.",
  },
  {
    key: "emails",
    label: "Emails (JSON)",
    type: "json",
    hint:
      'An array of objects, e.g. [{"email":"ada@example.com"}]. Overrides Email when both are set.',
  },
  {
    key: "phone",
    label: "Phone",
    type: "string",
    hint: "Sets `phones` to a single entry. Use Phones (JSON) for more than one.",
  },
  {
    key: "phoneType",
    label: "Phone type",
    type: "string",
    placeholder: "cellphone",
    hint: "The `type` half of the single phone entry — a phone type your account already uses.",
  },
  {
    key: "phones",
    label: "Phones (JSON)",
    type: "json",
    hint:
      'An array of objects, e.g. [{"phone":"+55 11 99999-0000","type":"cellphone"}]. Overrides ' +
      "Phone when both are set.",
  },
  { key: "title", label: "Job title", type: "string" },
  {
    key: "organizationId",
    label: "Organization ID",
    type: "string",
    hint: "The `_id` of an existing organization, from List Organizations.",
  },
  { key: "skype", label: "Skype", type: "string" },
  { key: "linkedin", label: "LinkedIn", type: "string" },
  { key: "facebook", label: "Facebook", type: "string" },
];

/** The single-entry `emails` array, from whichever of the two params was filled. */
function emailsOf(input: ContactFields): Array<{ email: string }> | undefined {
  const many = asArray<{ email: string }>(input.emails);
  if (many && many.length > 0) return many;
  return input.email ? [{ email: input.email }] : undefined;
}

/** The single-entry `phones` array, from whichever of the two params was filled. */
function phonesOf(input: ContactFields): Array<{ phone: string; type?: string }> | undefined {
  const many = asArray<{ phone: string; type?: string }>(input.phones);
  if (many && many.length > 0) return many;
  if (!input.phone) return undefined;
  const single: { phone: string; type?: string } = { phone: input.phone };
  if (input.phoneType) single.type = input.phoneType;
  return [single];
}

/** `{ contact: { … } }` — the body both the POST and the PUT expect. */
export function contactBody(input: ContactFields): Record<string, unknown> {
  return {
    contact: compact({
      name: input.name,
      emails: emailsOf(input),
      phones: phonesOf(input),
      title: input.title,
      organization_id: input.organizationId,
      skype: input.skype,
      linkedin: input.linkedin,
      facebook: input.facebook,
    }),
  };
}
