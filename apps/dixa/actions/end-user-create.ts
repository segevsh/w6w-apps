import type { ActionDefinition, Param } from "@w6w/types";
import { DixaClient, toList } from "../lib/client.ts";

export const END_USER_FIELDS = [
  "displayName",
  "firstName",
  "lastName",
  "email",
  "phoneNumber",
  "externalId",
  "avatarUrl",
] as const;

/** Build a create/patch body from the flat params: scalars trimmed, comma lists split. */
export function endUserBody(input: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const k of END_USER_FIELDS) {
    const v = input[k];
    if (typeof v === "string" && v.trim()) body[k] = v.trim();
  }
  const emails = toList(input.additionalEmails as string | undefined);
  if (emails) body.additionalEmails = emails;
  const phones = toList(input.additionalPhoneNumbers as string | undefined);
  if (phones) body.additionalPhoneNumbers = phones;
  return body;
}

export const endUserParams: Param[] = [
  { key: "displayName", label: "Display name", type: "string" },
  { key: "firstName", label: "First name", type: "string" },
  { key: "lastName", label: "Last name", type: "string" },
  { key: "email", label: "Email", type: "string" },
  { key: "phoneNumber", label: "Phone number", type: "string", hint: "E.164, e.g. +4512345678." },
  {
    key: "additionalEmails",
    label: "Additional emails",
    type: "string",
    hint: "Comma-separated.",
  },
  {
    key: "additionalPhoneNumbers",
    label: "Additional phone numbers",
    type: "string",
    hint: "Comma-separated.",
  },
  { key: "externalId", label: "External id", type: "string", hint: "Your own id for this person." },
  { key: "avatarUrl", label: "Avatar URL", type: "string" },
];

interface Input {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  additionalEmails?: string[] | string;
  additionalPhoneNumbers?: string[] | string;
  externalId?: string;
  avatarUrl?: string;
}

const endUserCreate: ActionDefinition<Input> = {
  key: "end-user-create",
  type: "perform",
  resource: "end-user",
  title: "Create End User",
  description: "Create an end user (a customer). Dixa documents no required field.",
  idempotent: false,
  params: endUserParams,
  output: [{ key: "data", type: "object", label: "The created end user" }],

  execute(input, ctx) {
    const body = endUserBody(input as Record<string, unknown>);
    if (Object.keys(body).length === 0) throw new Error("provide at least one end-user field");
    return new DixaClient(ctx).json("/endusers", { method: "POST", body });
  },
};

export default endUserCreate;
