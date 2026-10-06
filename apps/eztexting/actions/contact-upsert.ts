import type { ActionDefinition } from "@w6w/types";
import { asStringArray, compact, EzTextingClient } from "../lib/client.ts";

/**
 * `POST /v1/contacts` — "Create or Update Contact": the phone number is the key, so a repeat with
 * the same body ends in the same state (`idempotent: true`). Answers `{id}`.
 */
interface Input {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  note?: string;
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
  custom5?: string;
  values?: Record<string, string> | string;
  groupIdsAdd?: string[] | string;
  groupIdsRemove?: string[] | string;
}

const customParam = (n: number) => ({
  key: `custom${n}`,
  label: `Custom ${n}`,
  type: "string" as const,
  hint: "Up to 20 characters.",
  advanced: true,
});

const contactUpsert: ActionDefinition<Input> = {
  key: "contact-upsert",
  type: "perform",
  resource: "contact",
  title: "Create or Update Contact",
  description: "Create a contact, or update it if the phone number already exists.",
  idempotent: true,
  params: [
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      required: true,
      placeholder: "2125551234",
    },
    { key: "firstName", label: "First name", type: "string", validation: { maxLength: 20 } },
    { key: "lastName", label: "Last name", type: "string", validation: { maxLength: 20 } },
    { key: "email", label: "Email", type: "string" },
    { key: "note", label: "Note", type: "text", validation: { maxLength: 200 } },
    {
      key: "groupIdsAdd",
      label: "Add to group IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "groupIdsRemove",
      label: "Remove from group IDs",
      type: "array",
      item: { type: "string" },
      advanced: true,
    },
    ...[1, 2, 3, 4, 5].map(customParam),
    {
      key: "values",
      label: "Custom field values",
      type: "json",
      hint: "Object of custom-field name -> string value, for fields created in the account.",
      advanced: true,
    },
  ],
  output: [{ key: "id", type: "string", label: "Contact ID" }],

  async execute(input, ctx) {
    let values = input.values;
    if (typeof values === "string") values = values.trim() ? JSON.parse(values) : undefined;
    const result = await new EzTextingClient(ctx).json<{ id?: string }>("/contacts", {
      method: "POST",
      body: compact({
        phoneNumber: input.phoneNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        note: input.note,
        custom1: input.custom1,
        custom2: input.custom2,
        custom3: input.custom3,
        custom4: input.custom4,
        custom5: input.custom5,
        values,
        groupIdsAdd: asStringArray(input.groupIdsAdd),
        groupIdsRemove: asStringArray(input.groupIdsRemove),
      }),
    });
    ctx.log("info", "upserted an EZ Texting contact", { id: result?.id });
    return { id: result?.id };
  },
};

export default contactUpsert;
