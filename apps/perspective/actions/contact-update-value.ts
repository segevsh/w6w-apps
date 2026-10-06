import type { ActionDefinition } from "@w6w/types";
import { encodeId, PerspectiveClient, requireString } from "../lib/client.ts";
import { contactIdParam, funnelIdParam } from "../lib/params.ts";

/**
 * `PUT /v1/funnels/{funnelId}/contacts/{contactId}/values` — set ONE field.
 *
 * `fieldName` is a standard field (firstName, lastName, email, phone, status,
 * website, birthday, postalCode, city, state, country, street, houseNumber;
 * `zip` is a legacy alias of postalCode) or anything else, which Perspective
 * stores as a custom property. Reserved system fields (the `ps_*` metadata)
 * are refused with a 400. `value` is always a string on the wire.
 *
 * Marked non-idempotent: a field change can fire automations, so a blind retry
 * could run them twice.
 */
interface Input {
  funnelId: string;
  contactId: string;
  fieldName: string;
  value: string;
  skipAutomationTrigger?: boolean;
}

const contactUpdateValue: ActionDefinition<Input> = {
  key: "contact-update-value",
  type: "perform",
  resource: "contact",
  title: "Update Contact Value",
  description: "Set one standard field or custom property on a contact.",
  idempotent: false,
  params: [
    funnelIdParam,
    contactIdParam,
    {
      key: "fieldName",
      label: "Field name",
      type: "string",
      required: true,
      hint: "firstName, lastName, email, phone, status, website, birthday, postalCode, city, " +
        "state, country, street or houseNumber; any other name becomes a custom property.",
    },
    { key: "value", label: "Value", type: "string", required: true },
    {
      key: "skipAutomationTrigger",
      label: "Skip automation triggers",
      type: "boolean",
      default: false,
      hint: "When off, automations triggered by this field change run.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Updated value",
    },
  ],

  async execute(input, ctx) {
    const funnelId = encodeId(requireString(input.funnelId, "funnelId"));
    const contactId = encodeId(requireString(input.contactId, "contactId"));
    const fieldName = requireString(input.fieldName, "fieldName");
    if (input.value === undefined || input.value === null) throw new Error("value is required");
    const body: Record<string, unknown> = { fieldName, value: String(input.value) };
    if (input.skipAutomationTrigger !== undefined) {
      body.skipAutomationTrigger = input.skipAutomationTrigger;
    }
    const data = await new PerspectiveClient(ctx).data(
      `/funnels/${funnelId}/contacts/${contactId}/values`,
      { method: "PUT", body },
    );
    return { data };
  },
};

export default contactUpdateValue;
