import type { ActionDefinition } from "@w6w/types";
import { encodeId, PerspectiveClient, requireString } from "../lib/client.ts";
import { funnelIdParam } from "../lib/params.ts";

/**
 * `POST /v1/funnels/{funnelId}/contacts` — create a contact (answers 201).
 *
 * Either `email` or `phone` is required. `meta`, `utmParams` and `properties`
 * are read-only on this endpoint (write custom properties with Update Contact
 * Value), and the deprecated `timezone` field is deliberately not offered.
 * Creating a contact fires the automations configured for its initial status
 * unless `skipAutomationTrigger` is true.
 */
interface Input {
  funnelId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  website?: string;
  birthday?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
  street?: string;
  houseNumber?: string;
  skipAutomationTrigger?: boolean;
}

const ADDRESS_KEYS = ["postalCode", "city", "state", "country", "street", "houseNumber"] as const;

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a CRM contact in a funnel. Email or phone is required.",
  idempotent: false,
  params: [
    funnelIdParam,
    { key: "email", label: "Email", type: "string", hint: "Required if Phone is empty." },
    { key: "phone", label: "Phone", type: "string", hint: "Required if Email is empty." },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Must be one of the statuses configured for the funnel (e.g. lead).",
    },
    { key: "website", label: "Website", type: "string" },
    { key: "birthday", label: "Birthday", type: "string", hint: "Typically an ISO date." },
    {
      key: "address",
      label: "Address",
      title: "Address",
      type: "section",
      section: "collapsible",
      children: [
        { key: "street", label: "Street", type: "string" },
        { key: "houseNumber", label: "House number", type: "string" },
        { key: "postalCode", label: "Postal code", type: "string" },
        { key: "city", label: "City", type: "string" },
        { key: "state", label: "State / region", type: "string" },
        { key: "country", label: "Country", type: "string" },
      ],
    },
    {
      key: "skipAutomationTrigger",
      label: "Skip automation triggers",
      type: "boolean",
      default: false,
      hint: "When off, automations configured for the initial status run on creation.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The created contact" }],

  async execute(input, ctx) {
    const funnelId = requireString(input.funnelId, "funnelId");
    const email = input.email?.trim();
    const phone = input.phone?.trim();
    if (!email && !phone) throw new Error("either email or phone is required");

    const address: Record<string, string> = {};
    for (const k of ADDRESS_KEYS) {
      const v = input[k]?.trim();
      if (v) address[k] = v;
    }
    const body: Record<string, unknown> = {};
    const put = (k: string, v: unknown) => {
      if (typeof v === "string" ? v.trim() !== "" : v !== undefined) {
        body[k] = typeof v === "string" ? v.trim() : v;
      }
    };
    put("email", email);
    put("phone", phone);
    put("firstName", input.firstName);
    put("lastName", input.lastName);
    put("status", input.status);
    put("website", input.website);
    put("birthday", input.birthday);
    if (Object.keys(address).length > 0) body.address = address;
    if (input.skipAutomationTrigger !== undefined) {
      body.skipAutomationTrigger = input.skipAutomationTrigger;
    }

    const data = await new PerspectiveClient(ctx).data(
      `/funnels/${encodeId(funnelId)}/contacts`,
      { method: "POST", body },
    );
    return { data };
  },
};

export default contactCreate;
