import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the kvCORE actions.
 *
 * Every field name, type and description here is copied from the vendor's own
 * OpenAPI 3.1 document (embedded in `developer.insiderealestate.com`'s
 * `publicv2` reference pages, fetched 2026-09-29), not inferred.
 */

/** `status` — the lead lifecycle, from the Create/Update Contact schema. */
export const contactStatusOptions = [
  { value: 0, label: "New" },
  { value: 1, label: "Client" },
  { value: 2, label: "Closed" },
  { value: 3, label: "Sphere" },
  { value: 4, label: "Active" },
  { value: 5, label: "Contract" },
  { value: 6, label: "Archived" },
  { value: 7, label: "Prospect" },
];

/** `filter[leadtype][]` on `GET /contacts` — a separate vocabulary from `deal_type`. */
export const leadTypeOptions = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "renter", label: "Renter" },
  { value: "agent", label: "Agent" },
  { value: "vendor", label: "Vendor" },
];

/**
 * The shared "page + limit" pair, per the vendor's own API Standards guide:
 * `page` starts at 1, `limit` defaults to 100 and maxes at 500.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Page of results to return. Defaults to 1.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1, max: 500 },
      hint: "Records per page. The vendor's own default is 100, maximum 500.",
    },
  ];
}

/** Build the query object for {@link paginationParams}. */
export function paginationQuery(
  input: { page?: number; limit?: number },
): Record<string, number | undefined> {
  return { page: input.page, limit: input.limit };
}

/**
 * The Create/Update Contact fields. `create` adds the five routing/tracking
 * fields the vendor's schema omits from the update operation
 * (`signup_mlsid`, `signup_mls`, `owned_by_assigned`, `entity_owner_id`,
 * `hashtags`) — they only make sense at creation time, when a lead is first
 * being routed and sourced.
 */
export function contactFields(opts: { create: boolean }): Param[] {
  const base: Param[] = [
    {
      key: "first_name",
      label: "First name",
      type: "string",
      required: opts.create,
      hint: "First name of contact.",
    },
    {
      key: "last_name",
      label: "Last name",
      type: "string",
      required: opts.create,
      hint: "Last name of contact.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      required: opts.create,
      hint: "Email address for the contact.",
    },
    {
      key: "cell_phone_1",
      label: "Cell phone",
      type: "string",
      hint: "Cell phone for the contact. Will be used as the primary phone.",
    },
    { key: "home_phone", label: "Home phone", type: "string" },
    { key: "work_phone", label: "Work phone", type: "string" },
    { key: "fax", label: "Fax", type: "string" },
    {
      key: "deal_type",
      label: "Deal type",
      type: "multiselect",
      options: [
        { value: "buyer", label: "Buyer" },
        { value: "seller", label: "Seller" },
        { value: "renter", label: "Renter" },
      ],
      hint:
        "Sent as a comma-joined string, e.g. `buyer,seller` — the vendor documents this field " +
        "as a string, not a JSON array.",
    },
    { key: "primary_city", label: "City", type: "string" },
    { key: "primary_state", label: "State", type: "string" },
    { key: "primary_zip", label: "Postal code", type: "string" },
    { key: "primary_address", label: "Address", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: contactStatusOptions.map((o) => ({ value: String(o.value), label: o.label })),
      hint: "The lead status.",
    },
    {
      key: "source",
      label: "Source",
      type: "string",
      hint: "Top-level source the contact originated from.",
    },
    {
      key: "email_optin",
      label: "Email opt-in",
      type: "boolean",
      hint: "Whether the contact should get automated emails.",
    },
    {
      key: "phone_on",
      label: "Phone contact on",
      type: "boolean",
      hint: "Whether the contact should be contacted via phone.",
    },
    {
      key: "text_on",
      label: "Text opt-in",
      type: "boolean",
      hint: "Whether the contact should get automated texts.",
    },
    {
      key: "rating",
      label: "Rating",
      type: "number",
      validation: { integer: true, min: 0, max: 5 },
      hint: "0 (poor quality) to 5 (best).",
    },
    {
      key: "capture_method",
      label: "Capture method",
      type: "string",
      hint: 'How the lead was captured, e.g. "Website Lead Capture" or "Dropbox".',
    },
    {
      key: "assigned_agent_id",
      label: "Assigned agent (user ID)",
      type: "string",
      hint:
        "Leave empty to route the contact through lead-matching rules instead of assigning it " +
        "directly. Only takes effect if the contact is not already assigned.",
    },
    {
      key: "assigned_agent_external_id",
      label: "Assigned agent (external ID)",
      type: "string",
      hint: "Maps to the agent's own external_vendor_id. Ignored if assigned_agent_id is also set.",
    },
    {
      key: "tcpa_optin_date",
      label: "TCPA opt-in date",
      type: "datetime",
      hint: "Automated text messaging is on by default if this is omitted.",
    },
    { key: "avg_price", label: "Average viewed price", type: "number" },
    { key: "avg_beds", label: "Average viewed beds", type: "number" },
    { key: "avg_baths", label: "Average viewed baths", type: "number" },
    {
      key: "is_private",
      label: "Private lead",
      type: "boolean",
      default: false,
      hint:
        "Hides the lead from team/office/company admins. Only applies if the account has lead " +
        "privacy enabled.",
    },
    {
      key: "active_mls_id",
      label: "Active MLS ID",
      type: "string",
      hint: "If the lead is a seller, the MLS ID of the listing they are selling.",
    },
    { key: "spouse_first_name", label: "Spouse first name", type: "string" },
    { key: "spouse_last_name", label: "Spouse last name", type: "string" },
    { key: "spouse_phone", label: "Spouse phone", type: "string" },
    { key: "spouse_title", label: "Spouse title", type: "string" },
    { key: "title", label: "Title", type: "string" },
    { key: "birthday", label: "Birthday", type: "string" },
    { key: "gender", label: "Gender", type: "string" },
    { key: "poi_address", label: "Property of interest — address", type: "string" },
    { key: "poi_city", label: "Property of interest — city", type: "string" },
    { key: "poi_state", label: "Property of interest — state", type: "string" },
    { key: "poi_zip", label: "Property of interest — zip", type: "string" },
    { key: "second_email", label: "Secondary email", type: "string" },
    {
      key: "external_vendor_id",
      label: "External ID",
      type: "string",
      hint: "ID this contact is tracked by in an external system.",
    },
    { key: "last_closing_date", label: "Last closing date", type: "string" },
  ];

  if (!opts.create) return base;

  return [
    ...base,
    {
      key: "signup_mlsid",
      label: "Signup MLS ID",
      type: "string",
      hint: "Unique MLS identifier captured at signup. Used for lead routing.",
    },
    {
      key: "signup_mls",
      label: "Signup MLS board",
      type: "number",
      hint: "Which MLS board signup_mlsid belongs to, for accounts with multiple boards.",
    },
    {
      key: "owned_by_assigned",
      label: "Private to assigned agent",
      type: "boolean",
      hint:
        "Makes the lead private to the assigned agent — not visible to team, office or company.",
    },
    {
      key: "entity_owner_id",
      label: "Owning entity ID",
      type: "string",
      hint: "Routes the contact through this entity's (company/team/office) lead-routing rules.",
    },
    {
      key: "hashtags",
      label: "Hashtags",
      type: "string",
      hint: "Space- or comma-separated hashtags, each prefixed with #.",
    },
  ];
}

/**
 * Build the create/update request body from {@link contactFields}' input
 * shape. `deal_type` is joined into the comma-separated string the vendor's
 * schema documents (`type: "string"`, despite the `multiselect` UI), and every
 * boolean field is sent as the `1`/`0` integer the vendor's schema expects —
 * per the API Standards guide, "The API accepts true or 1 and false or 0",
 * but every worked example in the vendor's own guides sends the integer.
 */
export function contactBody(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input };
  if (Array.isArray(out.deal_type)) out.deal_type = (out.deal_type as string[]).join(",");
  for (const key of ["email_optin", "phone_on", "text_on", "is_private", "owned_by_assigned"]) {
    if (typeof out[key] === "boolean") out[key] = out[key] ? 1 : 0;
  }
  if (out.status !== undefined && out.status !== "") out.status = Number(out.status);
  return compactBody(out);
}

function compactBody(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * The Create/Update Office and Create/Update Team fields — identical between
 * the two entity kinds except office-only `about_alt_french` and
 * `docusign_office_id`, and office-update dropping both. `create` requires
 * `name`; per the vendor's schema, so does team update (office update does
 * not require it).
 */
export function entityFields(
  kind: "office" | "team",
  opts: { create: boolean },
): Param[] {
  const noun = kind === "office" ? "office" : "team";
  const base: Param[] = [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: opts.create || kind === "team",
      hint: `Name of the ${noun}.`,
    },
    { key: "email", label: "Email", type: "string", hint: `Email address for the ${noun}.` },
    { key: "phone", label: "Phone", type: "string", hint: `Phone number for the ${noun}.` },
    {
      key: "status",
      label: "Active",
      type: "boolean",
      hint: `Whether the ${noun} is active.`,
    },
    { key: "tagline", label: "Tagline", type: "string" },
    { key: "fax", label: "Fax", type: "string" },
    {
      key: "visibility",
      label: "Visible on website",
      type: "boolean",
    },
    {
      key: "photo",
      label: "Logo URL",
      type: "string",
      hint: `Fully qualified URL for the ${noun} logo.`,
    },
    {
      key: "business_photo",
      label: "Building photo URL",
      type: "string",
      hint: `Fully qualified URL for the ${noun} building photo.`,
    },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string", hint: "Abbreviated state (2 characters)." },
    { key: "address", label: "Address", type: "string" },
    { key: "zip", label: "Postal code", type: "string" },
    { key: "location", label: "Service location", type: "string" },
    {
      key: "mls_id",
      label: "MLS IDs",
      type: "string",
      hint: `Comma-delimited list of IDX MLS IDs that can be used to look up this ${noun}.`,
    },
    { key: "about", label: "About", type: "string" },
  ];

  if (kind !== "office") return base;

  const officeExtra: Param[] = [
    {
      key: "show_user_on_site",
      label: "Display user ID",
      type: "string",
      hint: "ID of the user to display on the office website.",
    },
    { key: "external_vendor_id", label: "External ID", type: "string" },
  ];
  if (opts.create) {
    return [
      ...base,
      ...officeExtra,
      { key: "about_alt_french", label: "About (French)", type: "string" },
      { key: "docusign_office_id", label: "DocuSign office ID", type: "string" },
    ];
  }
  return [...base, ...officeExtra];
}

/** Build the create/update body from {@link entityFields}' input shape. */
export function entityBody(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input };
  for (const key of ["status", "visibility"]) {
    if (typeof out[key] === "boolean") out[key] = out[key] ? 1 : 0;
  }
  return compactBody(out);
}

/**
 * The Create/Update User fields. `primary_office_id` is create-only per the
 * vendor's schema — it seeds which office website the new agent's own
 * website is generated under, which is meaningless to change after the fact
 * through this endpoint.
 */
export function userFields(opts: { create: boolean }): Param[] {
  const base: Param[] = [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: opts.create,
      hint: "Must be unique across the account.",
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "agent", label: "Agent" },
        { value: "lender", label: "Lender" },
      ],
      default: "agent",
    },
    { key: "status", label: "Active", type: "boolean", default: true },
    { key: "company_admin", label: "Company admin", type: "boolean", default: false },
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    { key: "cell_phone", label: "Cell phone", type: "string" },
    { key: "show_cell_phone", label: "Show cell phone on website", type: "boolean" },
    { key: "work_phone", label: "Work phone", type: "string" },
    { key: "show_work_phone", label: "Show work phone on website", type: "boolean" },
    { key: "direct_phone", label: "Direct phone", type: "string" },
    { key: "show_direct_phone", label: "Show direct phone on website", type: "boolean" },
    {
      key: "registered",
      label: "Registered at",
      type: "datetime",
      hint: "UTC. Formatted YYYY-MM-DD H:i:s.",
    },
    { key: "external_vendor_id", label: "External ID", type: "string" },
    { key: "visibility", label: "Visible on website", type: "boolean", default: true },
    { key: "photo", label: "Photo URL", type: "string" },
    { key: "facebook_url", label: "Facebook URL", type: "string" },
    { key: "twitter_url", label: "Twitter/X URL", type: "string" },
    { key: "linkedin_url", label: "LinkedIn URL", type: "string" },
  ];
  if (!opts.create) return base;
  return [
    ...base,
    {
      key: "primary_office_id",
      label: "Primary office ID",
      type: "string",
      hint: "Associates the new user's website with a specific office website/domain.",
    },
  ];
}

/** Build the create/update body from {@link userFields}' input shape. */
export function userBody(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input };
  for (
    const key of [
      "status",
      "company_admin",
      "show_cell_phone",
      "show_work_phone",
      "show_direct_phone",
      "visibility",
    ]
  ) {
    if (typeof out[key] === "boolean") out[key] = out[key] ? 1 : 0;
  }
  return compactBody(out);
}
