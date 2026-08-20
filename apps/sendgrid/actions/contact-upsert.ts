import type { ActionDefinition } from "@w6w/types";

/**
 * Create or update a contact. Maps camelCase params to SendGrid's snake_case
 * body (`first_name`, `address_line_1`, `custom_fields`, …). Optionally adds
 * the contact to one or more lists via `list_ids`.
 * Wraps `PUT /v3/marketing/contacts`.
 */
/**
 * True when a param value carries nothing the caller meant to send: unset, an
 * empty string, an empty list, or an empty object. Declared defaults are `[]` /
 * `{}`, so without this a defaulted-but-untouched field would shadow the
 * deprecated `additionalFields` fallback instead of deferring to it.
 */
function isBlank(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length === 0;
  return false;
}

const action: ActionDefinition = {
  key: "contact-upsert",
  type: "perform",
  resource: "contact",
  title: "Create or update a contact",
  description: "Create a new contact, or update the current one if it already exists (upsert)",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      default: "",
      hint: "Primary email for the contact",
    },
    {
      key: "name",
      label: "Name",
      type: "section",
      section: "group",
      layout: "row",
      children: [
        { key: "firstName", label: "First Name", type: "string", default: "" },
        { key: "lastName", label: "Last Name", type: "string", default: "" },
      ],
    },
    {
      key: "listIds",
      label: "List IDs",
      type: "multiselect",
      default: [],
      hint: "IDs of lists this contact should be added to",
    },
    {
      key: "contactDetails",
      label: "Additional details",
      type: "section",
      section: "collapsible",
      title: "Additional details",
      subtitle: "Address, alternate emails, custom fields",
      collapsed: true,
      children: [
        {
          key: "address",
          label: "Address",
          type: "section",
          section: "group",
          layout: "row",
          children: [
            { key: "address1", label: "Address Line 1", type: "string", default: "" },
            { key: "address2", label: "Address Line 2", type: "string", default: "" },
          ],
        },
        {
          key: "locality",
          label: "Locality",
          type: "section",
          section: "group",
          layout: "row",
          children: [
            { key: "city", label: "City", type: "string", default: "" },
            {
              key: "stateProvinceRegion",
              label: "State/Province/Region",
              type: "string",
              default: "",
            },
          ],
        },
        {
          key: "region",
          label: "Region",
          type: "section",
          section: "group",
          layout: "row",
          children: [
            { key: "postalCode", label: "Postal Code", type: "string", default: "" },
            { key: "country", label: "Country", type: "string", default: "" },
          ],
        },
        {
          key: "alternateEmails",
          label: "Alternate Emails",
          type: "string",
          default: "",
          hint: "Comma-separated list of additional addresses for this contact",
        },
        {
          key: "customFields",
          // The old shape was a `group` of ONE fieldId/fieldValue pair, so it
          // could carry exactly one custom field and only via a JSON editor.
          // A map is what SendGrid takes and what the form can actually edit.
          label: "Custom Fields",
          type: "json",
          default: {},
          hint:
            'Custom field id -> value, e.g. { "e1_T": "gold" }. Ids come from Marketing -> Custom Fields.',
        },
      ],
    },
    {
      key: "additionalFields",
      // DEPRECATED — see mail-send.ts. Kept declared so steps saved against the
      // old group shape keep working; `resolveParams` drops undeclared keys.
      label: "Additional Fields (deprecated)",
      type: "json",
      default: {},
      advanced: true,
      hint: "Superseded by the fields above and kept only so older saved steps keep working. " +
        "Anything set here is used only when the matching field above is empty.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = String(p.email ?? "").trim();
    if (!email) throw new Error("`email` is required");

    // Optional fields used to live inside an `additionalFields` group, which the
    // studio renders as a raw JSON editor — unreachable as form fields. They are
    // flat now; the group survives only as a fallback for steps saved earlier.
    const add = (p.additionalFields ?? {}) as Record<string, unknown>;
    const legacyAddress = (add.addressUi ?? {}) as Record<string, unknown>;
    const pick = (key: string, legacyKey = key): unknown => {
      const flat = p[key];
      if (!isBlank(flat)) return flat;
      const nested = legacyAddress[legacyKey];
      if (!isBlank(nested)) return nested;
      return add[legacyKey];
    };

    const contact: Record<string, unknown> = { email };

    const set = (field: string, key: string) => {
      const v = pick(key);
      if (!isBlank(v)) contact[field] = String(v);
    };
    set("address_line_1", "address1");
    set("address_line_2", "address2");
    set("city", "city");
    set("country", "country");
    set("first_name", "firstName");
    set("last_name", "lastName");
    set("postal_code", "postalCode");
    set("state_province_region", "stateProvinceRegion");

    const alternateEmails = pick("alternateEmails");
    if (typeof alternateEmails === "string" && alternateEmails.length) {
      const alts = alternateEmails.split(",").map((s) => s.trim()).filter(Boolean);
      if (alts.length) contact.alternate_emails = alts;
    }

    // Two accepted shapes: the map the JSON editor now produces, and the old
    // group's `{ fieldId, fieldValue }` row (or list of rows).
    const customFieldsRaw = pick("customFields");
    if (customFieldsRaw) {
      const custom: Record<string, unknown> = {};
      const parsed = typeof customFieldsRaw === "string"
        ? (() => {
          try {
            return JSON.parse(customFieldsRaw);
          } catch {
            throw new Error("`customFields` is not valid JSON.");
          }
        })()
        : customFieldsRaw;
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      for (const row of rows) {
        const r = row as Record<string, unknown>;
        if (!r || typeof r !== "object") continue;
        if (r.fieldId) {
          custom[String(r.fieldId)] = r.fieldValue;
          continue;
        }
        for (const [k, v] of Object.entries(r)) {
          if (v !== undefined && v !== null && v !== "") custom[k] = v;
        }
      }
      if (Object.keys(custom).length) contact.custom_fields = custom;
    }

    const body: Record<string, unknown> = { contacts: [contact] };
    const listIdsRaw = pick("listIds");
    if (Array.isArray(listIdsRaw) && listIdsRaw.length) {
      body.list_ids = listIdsRaw.map((v) => String(v));
    }

    ctx.log("info", "upserting SendGrid contact", { email });

    const res = await ctx.fetch("https://api.sendgrid.com/v3/marketing/contacts", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid /v3/marketing/contacts returned ${res.status}: ${errText}`);
    }

    return await res.json();
  },
};

export default action;
