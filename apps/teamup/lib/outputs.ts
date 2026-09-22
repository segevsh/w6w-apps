import type { OutputField } from "@w6w/types";

/**
 * Shared `output` field lists and the pagination envelope type.
 *
 * ## Why these are shared, and what they are not
 *
 * Every TeamUp resource that more than one action returns (a Customer from
 * `customers-list`, `customers-get` and `customers-create`, an Event from the
 * three event actions) declares the same field list here, so the three
 * actions cannot drift apart. The field **names** are exact: they are the
 * property names in the operation data published in TeamUp's own API
 * reference (<https://docs.goteamup.com/api-reference>, read 2026-09-22).
 *
 * The `type` on each field is a presentation hint for the editor's preview —
 * a declared `output` never filters or reshapes anything. Every action
 * returns the vendor's response body **verbatim**.
 *
 * Two conventions are worth spelling out because they look arbitrary
 * otherwise:
 *
 *  - **Money is a `string`.** TeamUp's error envelope (`field_errors`,
 *    `non_field_errors`, `code`/`message`/`type`) is Django REST Framework's,
 *    and DRF serializes a `DecimalField` to a string by default. So `price`,
 *    `billed_price` and `total_amount_due` are declared as strings rather
 *    than numbers that may not survive the round trip.
 *  - **Related records are `object`.** The reference marks `venue`,
 *    `offering_type`, `customer_membership` and friends as required fields of
 *    the parent resource without publishing the nested schema, so they are
 *    declared as objects and passed through untouched.
 */

/** The envelope every TeamUp list operation returns, verbatim. */
export interface Page<T = unknown> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** `{count, next, previous, results}` — the shape every list action returns. */
export const pageOutput: OutputField[] = [
  { key: "count", type: "number", label: "Total matching records" },
  { key: "next", type: "string", label: "URL of the next page" },
  { key: "previous", type: "string", label: "URL of the previous page" },
  { key: "results", type: "array", label: "Records on this page" },
];

/** A Customer — `customers-list`, `customers-get`, `customers-create`. */
export const customerOutput: OutputField[] = [
  { key: "id", type: "number", label: "Customer ID" },
  { key: "object", type: "string", label: "Object type (\u201ccustomer\u201d)" },
  { key: "first_name", type: "string", label: "First name" },
  { key: "last_name", type: "string", label: "Last name" },
  { key: "email", type: "string", label: "Email" },
  { key: "status", type: "string", label: "Status" },
  { key: "is_status_locked", type: "boolean", label: "Status locked" },
  { key: "visibility", type: "string", label: "Visibility (visible/hidden)" },
  { key: "family_role", type: "string", label: "Family role (manager/child)" },
  { key: "family", type: "number", label: "Family ID" },
  { key: "participating", type: "boolean", label: "Participating" },
  { key: "is_lead", type: "boolean", label: "Is a lead" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "invitation_url", type: "string", label: "Invitation URL" },
  { key: "image", type: "object", label: "Profile image" },
  { key: "referral_code", type: "object", label: "Referral code" },
  { key: "provider", type: "object", label: "Provider" },
  { key: "field_values", type: "array", label: "Custom field values" },
  { key: "is_opted_into_broadcast_messages", type: "boolean", label: "Opted into broadcasts" },
  { key: "is_opted_into_sms_marketing", type: "boolean", label: "Opted into SMS marketing" },
  { key: "sms_account", type: "object", label: "SMS account" },
  { key: "customer_venue", type: "object", label: "Customer venue" },
  { key: "credit_balance", type: "object", label: "Credit balance" },
  { key: "staff_assignments", type: "array", label: "Staff assignments" },
];

/** An Event — one occurrence on the class schedule. */
export const eventOutput: OutputField[] = [
  { key: "id", type: "number", label: "Event ID" },
  { key: "object", type: "string", label: "Object type (\u201cevent\u201d)" },
  { key: "name", type: "string", label: "Name" },
  { key: "description", type: "string", label: "Description" },
  { key: "starts_at", type: "string", label: "Starts at" },
  { key: "ends_at", type: "string", label: "Ends at" },
  { key: "status", type: "string", label: "Status (active/cancelled)" },
  { key: "max_occupancy", type: "number", label: "Maximum occupancy" },
  { key: "waitlist_max_override", type: "number", label: "Waitlist maximum override" },
  { key: "attending_count", type: "number", label: "Attending count" },
  { key: "waiting_count", type: "number", label: "Waiting count" },
  { key: "is_appointment", type: "boolean", label: "Is an appointment" },
  { key: "venue", type: "object", label: "Venue" },
  { key: "venue_room", type: "object", label: "Venue room" },
  { key: "registrations_open_at", type: "string", label: "Registrations open at" },
  { key: "registrations_close_at", type: "string", label: "Registrations close at" },
  { key: "late_cancel_deadline", type: "string", label: "Late-cancel deadline" },
  { key: "instructors", type: "array", label: "Instructors" },
  { key: "offering_type", type: "object", label: "Offering type" },
  { key: "customer_url", type: "string", label: "Customer-facing URL" },
  { key: "provider_url", type: "string", label: "Provider-facing URL" },
  { key: "schedule_type", type: "string", label: "Schedule type" },
  { key: "is_full", type: "boolean", label: "Full" },
  { key: "category", type: "object", label: "Category" },
  { key: "active_registration_status", type: "string", label: "Active registration status" },
  {
    key: "overriden_registration_timelines",
    type: "array",
    label: "Overridden registration timelines",
  },
];

/** A waitlist spot — the record `events-join-waitlist` returns. */
export const waitlistSpotOutput: OutputField[] = [
  { key: "id", type: "number", label: "Waitlist spot ID" },
  { key: "object", type: "string", label: "Object type (\u201cwaitlist_spot\u201d)" },
  { key: "status", type: "string", label: "Status" },
  { key: "added_at", type: "string", label: "Added at" },
  { key: "spot_reserved_at", type: "string", label: "Spot reserved at" },
  { key: "reserved_spot_expires_at", type: "string", label: "Reserved spot expires at" },
  { key: "position", type: "number", label: "Position in the queue" },
];

/** An Attendance — one customer's registration for one event. */
export const attendanceOutput: OutputField[] = [
  { key: "id", type: "number", label: "Attendance ID" },
  { key: "object", type: "string", label: "Object type (\u201cattendance\u201d)" },
  { key: "customer", type: "object", label: "Customer" },
  { key: "event", type: "object", label: "Event" },
  {
    key: "status",
    type: "string",
    label: "Status (not_registered/registered/attended/no_show/late_cancelled)",
  },
  { key: "customer_membership", type: "object", label: "Paying customer membership" },
  { key: "booking_source", type: "string", label: "Booking source" },
  { key: "gympass_booking", type: "object", label: "Gympass booking" },
  { key: "waitlist_spot", type: "object", label: "Waitlist spot" },
];

/** A Membership — the sellable plan or pack, not a customer's instance. */
export const membershipOutput: OutputField[] = [
  { key: "id", type: "number", label: "Membership ID" },
  { key: "object", type: "string", label: "Object type (\u201cmembership\u201d)" },
  {
    key: "type",
    type: "string",
    label: "Type (pack/recurring_plan/prepaid_plan)",
  },
  { key: "name", type: "string", label: "Name" },
  { key: "description", type: "string", label: "Description" },
  { key: "begin_on_first_registration", type: "boolean", label: "Begins on first registration" },
  { key: "start_date", type: "string", label: "Start date" },
  { key: "expiration_date", type: "string", label: "Expiration date" },
  { key: "duration", type: "number", label: "Duration" },
  { key: "duration_unit", type: "string", label: "Duration unit (days/weeks/months)" },
  { key: "one_time_fee", type: "string", label: "One-time fee" },
  { key: "price", type: "string", label: "Price" },
  { key: "display_price", type: "string", label: "Display price" },
  { key: "use_prorate", type: "boolean", label: "Uses proration" },
  { key: "category", type: "object", label: "Category" },
  { key: "is_dropin", type: "boolean", label: "Is a drop-in" },
  { key: "for_sale", type: "boolean", label: "For sale" },
  { key: "has_active_members", type: "boolean", label: "Has active members" },
  { key: "active_member_count", type: "number", label: "Active member count" },
  { key: "allow_repeat_purchases", type: "boolean", label: "Allows repeat purchases" },
  { key: "visible_to_customers", type: "boolean", label: "Visible to customers" },
  { key: "purchasable_only_by_provider", type: "boolean", label: "Provider-only purchase" },
  { key: "new_customers_only", type: "boolean", label: "New customers only" },
  { key: "penalty_system", type: "object", label: "Penalty system" },
  { key: "allotment", type: "array", label: "Allotment" },
  { key: "plans", type: "array", label: "Payment plans" },
  { key: "terms", type: "string", label: "Terms" },
  { key: "is_draft", type: "boolean", label: "Is a draft" },
  { key: "incomplete_reasons", type: "array", label: "Incomplete reasons" },
  { key: "shareable", type: "boolean", label: "Shareable" },
];

/** A CustomerMembership — one customer's purchased or assigned instance. */
export const customerMembershipOutput: OutputField[] = [
  { key: "id", type: "number", label: "Customer membership ID" },
  { key: "object", type: "string", label: "Object type (\u201ccustomermembership\u201d)" },
  { key: "name", type: "string", label: "Name" },
  { key: "start_date", type: "string", label: "Start date" },
  { key: "expiration_date", type: "string", label: "Expiration date" },
  { key: "renewal_date", type: "string", label: "Renewal date" },
  { key: "status", type: "string", label: "Status (active/hold/completed/cancelled)" },
  { key: "membership", type: "object", label: "Membership plan" },
  { key: "customer", type: "object", label: "Customer" },
  { key: "discount_code", type: "object", label: "Discount code" },
  { key: "billed_price", type: "string", label: "Billed price" },
  { key: "active_hold", type: "object", label: "Active hold" },
  { key: "payment_subscription", type: "object", label: "Payment subscription" },
  {
    key: "discount_code_makes_free_forever",
    type: "boolean",
    label: "Discount code makes it free forever",
  },
  { key: "is_set_for_cancellation", type: "boolean", label: "Set for cancellation" },
  {
    key: "cancellation_reason",
    type: "string",
    label: "Cancellation reason (upgraded/cancelled/mistake/downgraded/no_auto_renew)",
  },
  { key: "next_billing_date", type: "string", label: "Next billing date" },
  { key: "shared_with", type: "array", label: "Shared with" },
];

/** An Instructor. */
export const instructorOutput: OutputField[] = [
  { key: "id", type: "number", label: "Instructor ID" },
  { key: "object", type: "string", label: "Object type (\u201cinstructor\u201d)" },
  { key: "name", type: "string", label: "Name" },
  { key: "picture_url", type: "string", label: "Picture URL" },
  { key: "description", type: "string", label: "Description" },
  { key: "permissions", type: "object", label: "Permissions" },
  { key: "staff", type: "number", label: "Staff ID" },
  { key: "availability_schedules", type: "array", label: "Availability schedules" },
  { key: "icalendar_links", type: "array", label: "iCalendar links" },
];

/** A Venue — a physical or online location, with its rooms. */
export const venueOutput: OutputField[] = [
  { key: "id", type: "number", label: "Venue ID" },
  { key: "object", type: "string", label: "Object type (\u201cvenue\u201d)" },
  { key: "name", type: "string", label: "Name" },
  { key: "description", type: "string", label: "Description" },
  { key: "address", type: "object", label: "Address" },
  { key: "physical_address", type: "object", label: "Physical address" },
  { key: "timezone", type: "string", label: "Timezone" },
  { key: "video_url", type: "string", label: "Video URL" },
  { key: "zoom_user", type: "object", label: "Zoom user" },
  { key: "venue_type", type: "string", label: "Venue type (physical/online)" },
  { key: "venue_rooms", type: "array", label: "Venue rooms" },
  { key: "lat", type: "number", label: "Latitude" },
  { key: "lng", type: "number", label: "Longitude" },
  { key: "archived", type: "boolean", label: "Archived" },
  { key: "is_online", type: "boolean", label: "Is online" },
  { key: "video_url_type", type: "string", label: "Video URL type (static/zoom)" },
];

/** An Invoice, with its line items and amounts. */
export const invoiceOutput: OutputField[] = [
  { key: "id", type: "number", label: "Invoice ID" },
  { key: "object", type: "string", label: "Object type (\u201cinvoice\u201d)" },
  {
    key: "status",
    type: "string",
    label:
      "Status (open/paid/pending_offline/pending/failed/voided/retrying/retry_failed/upcoming/draft/skipped)",
  },
  { key: "due_date", type: "string", label: "Due date" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "is_credit_note", type: "boolean", label: "Is a credit note" },
  { key: "total_amount_due", type: "string", label: "Total amount due" },
  { key: "payer", type: "object", label: "Payer" },
  { key: "legacy_invoice_key", type: "string", label: "Legacy invoice key" },
  { key: "receipt_url", type: "string", label: "Receipt URL" },
  { key: "charges", type: "array", label: "Charges" },
  { key: "line_items", type: "array", label: "Line items" },
  { key: "discounts", type: "array", label: "Discounts" },
  { key: "adjustments", type: "array", label: "Adjustments" },
  { key: "applied_credits", type: "array", label: "Applied credits" },
  { key: "taxes", type: "array", label: "Taxes" },
  { key: "credit_notes", type: "array", label: "Credit notes" },
];

/** A Checkin — a front-desk visit, independent of class registration. */
export const checkinOutput: OutputField[] = [
  { key: "id", type: "number", label: "Check-in ID" },
  { key: "object", type: "string", label: "Object type (\u201ccheckin\u201d)" },
  { key: "timestamp", type: "string", label: "Timestamp" },
  { key: "comped", type: "boolean", label: "Comped" },
  { key: "customer_membership", type: "object", label: "Charged customer membership" },
];
