import type { OutputField } from "@w6w/types";

/**
 * Eventbrite's record shapes — the ONE copy. Every action and trigger that returns one of these
 * records declares it from here (`output`) and demos it from the matching `*_SAMPLE` (`sample`).
 *
 * Shapes follow what Eventbrite's API returns and `execute` hands back unchanged (the recorded
 * responses for events, ticket classes, organizations and webhooks; the v3 reference for the
 * rest). A nested object is declared as dot paths (`venue.name`); an array of objects declares
 * `items` (one level, keys relative to the element), so a list field nested inside a list item is
 * declared as a plain `array`.
 *
 * Samples are SYNTHETIC: fake ids, `@example.com` addresses, placeholder names. They carry every
 * declared key, so the sample matches its `output` exactly.
 */

const s = (key: string, label: string): OutputField => ({ key, type: "string", label });
const n = (key: string, label: string): OutputField => ({ key, type: "number", label });
const b = (key: string, label: string): OutputField => ({ key, type: "boolean", label });
const o = (key: string, label: string): OutputField => ({ key, type: "object", label });
const a = (key: string, label: string, items?: OutputField[]): OutputField =>
  items ? { key, type: "array", label, items } : { key, type: "array", label };

/** Fake ids shared by the samples so a record's references line up. */
const ID = {
  event: "1000000001",
  organization: "1000000002",
  order: "1000000003",
  attendee: "1000000004",
  ticketClass: "1000000005",
  webhook: "1000000006",
  user: "1000000007",
  organizer: "1000000008",
  venue: "1000000009",
  logo: "1000000010",
} as const;

const API = "https://www.eventbriteapi.com/v3";

/** Prefix every key of a record shape (`id` -> `resource.id`); `items` stay element-relative. */
export function prefixOutput(prefix: string, fields: readonly OutputField[]): OutputField[] {
  return fields.map((f) => ({ ...f, key: `${prefix}.${f.key}` }));
}

// ---- money ----------------------------------------------------------------------------------

const money = (key: string, label: string): OutputField[] => [
  o(key, label),
  s(`${key}.display`, `${label} (display)`),
  s(`${key}.currency`, `${label} currency`),
  n(`${key}.value`, `${label} (minor units)`),
  s(`${key}.major_value`, `${label} (major units)`),
];

const moneySample = (display: string, value: number) => ({
  display,
  currency: "USD",
  value,
  major_value: (value / 100).toFixed(2),
});

// ---- pagination -----------------------------------------------------------------------------

/** The `pagination` object every list response carries. */
export const PAGINATION_OUTPUT: OutputField[] = [
  o("pagination", "Pagination"),
  n("pagination.object_count", "Total items"),
  n("pagination.page_number", "Page number"),
  n("pagination.page_size", "Page size"),
  n("pagination.page_count", "Page count"),
  b("pagination.has_more_items", "Has more items"),
];

/** The cursor-paged lists (organizations, webhooks, attendees, orders) also carry `continuation`. */
export const PAGINATION_CONTINUATION_OUTPUT: OutputField[] = [
  ...PAGINATION_OUTPUT,
  s("pagination.continuation", "Continuation token"),
];

export const PAGINATION_SAMPLE = {
  object_count: 1,
  page_number: 1,
  page_size: 50,
  page_count: 1,
  has_more_items: false,
};

export const PAGINATION_CONTINUATION_SAMPLE = {
  ...PAGINATION_SAMPLE,
  continuation: "example-continuation-token",
};

// ---- venue ----------------------------------------------------------------------------------

export const VENUE_OUTPUT: OutputField[] = [
  s("id", "Venue ID"),
  s("name", "Name"),
  s("resource_uri", "Resource URI"),
  n("capacity", "Capacity"),
  s("age_restriction", "Age restriction"),
  s("latitude", "Latitude"),
  s("longitude", "Longitude"),
  o("address", "Address"),
  s("address.address_1", "Address line 1"),
  s("address.address_2", "Address line 2"),
  s("address.city", "City"),
  s("address.region", "Region"),
  s("address.postal_code", "Postal code"),
  s("address.country", "Country"),
  s("address.latitude", "Address latitude"),
  s("address.longitude", "Address longitude"),
  s("address.localized_address_display", "Address"),
  s("address.localized_area_display", "Area"),
  a("address.localized_multi_line_address_display", "Address lines"),
];

export const VENUE_SAMPLE = {
  id: ID.venue,
  name: "Main Hall",
  resource_uri: `${API}/venues/${ID.venue}/`,
  capacity: 300,
  age_restriction: "ALL_AGES",
  latitude: "10.123456",
  longitude: "20.654321",
  address: {
    address_1: "1 Example Street",
    address_2: "Suite 1",
    city: "Springfield",
    region: "ST",
    postal_code: "00000",
    country: "US",
    latitude: "10.123456",
    longitude: "20.654321",
    localized_address_display: "1 Example Street, Springfield, ST 00000",
    localized_area_display: "Springfield, ST",
    localized_multi_line_address_display: ["1 Example Street", "Springfield, ST 00000"],
  },
};

// ---- ticket class ---------------------------------------------------------------------------

export const TICKET_CLASS_OUTPUT: OutputField[] = [
  s("id", "Ticket class ID"),
  s("event_id", "Event ID"),
  s("name", "Name"),
  s("display_name", "Display name"),
  s("description", "Description"),
  s("resource_uri", "Resource URI"),
  ...money("cost", "Cost"),
  ...money("fee", "Fee"),
  ...money("tax", "Tax"),
  o("actual_cost", "Actual cost"),
  ...money("actual_fee", "Actual fee"),
  n("sorting", "Sorting"),
  b("donation", "Donation"),
  b("free", "Free"),
  n("capacity", "Capacity"),
  n("quantity_total", "Quantity total"),
  n("quantity_sold", "Quantity sold"),
  n("quantity_pending", "Quantity pending"),
  n("minimum_quantity", "Minimum quantity"),
  n("maximum_quantity", "Maximum quantity"),
  n("maximum_quantity_per_order", "Maximum quantity per order"),
  s("on_sale_status", "On-sale status"),
  s("sales_start", "Sales start"),
  s("sales_end", "Sales end"),
  o("sales_end_relative", "Sales end (relative)"),
  b("hidden", "Hidden"),
  b("hidden_currently", "Hidden now"),
  b("auto_hide", "Auto hide"),
  b("include_fee", "Fee included"),
  b("split_fee", "Fee split"),
  b("hide_description", "Hide description"),
  b("hide_sale_dates", "Hide sale dates"),
  b("has_pdf_ticket", "Has PDF ticket"),
  s("order_confirmation_message", "Order confirmation message"),
  a("delivery_methods", "Delivery methods"),
  s("category", "Category"),
  a("sales_channels", "Sales channels"),
  b("secondary_assignment_enabled", "Secondary assignment enabled"),
  s("image_id", "Image ID"),
  b("early_access_purchase_windows", "Early access purchase windows"),
  s("ticket_parent_id", "Parent ticket ID"),
  a("payment_constraints", "Payment constraints"),
  b("sold_out_alert_enabled", "Sold-out alert enabled"),
  a("sold_out_alert_recipients", "Sold-out alert recipients"),
];

export const TICKET_CLASS_SAMPLE = {
  id: ID.ticketClass,
  event_id: ID.event,
  name: "General Admission",
  display_name: "General Admission",
  description: "One entry to the event",
  resource_uri: `${API}/events/${ID.event}/ticket_classes/${ID.ticketClass}/`,
  cost: moneySample("$25.00", 2500),
  fee: moneySample("$1.50", 150),
  tax: moneySample("$0.00", 0),
  actual_cost: null,
  actual_fee: moneySample("$1.50", 150),
  sorting: 1,
  donation: false,
  free: false,
  capacity: 200,
  quantity_total: 200,
  quantity_sold: 12,
  quantity_pending: 0,
  minimum_quantity: 1,
  maximum_quantity: 10,
  maximum_quantity_per_order: 10,
  on_sale_status: "AVAILABLE",
  sales_start: "2026-10-01T09:00:00Z",
  sales_end: "2026-11-01T17:00:00Z",
  sales_end_relative: null,
  hidden: false,
  hidden_currently: false,
  auto_hide: false,
  include_fee: false,
  split_fee: false,
  hide_description: false,
  hide_sale_dates: false,
  has_pdf_ticket: true,
  order_confirmation_message: "Thanks for your order",
  delivery_methods: ["electronic"],
  category: "admission",
  sales_channels: ["online", "atd"],
  secondary_assignment_enabled: false,
  image_id: null,
  early_access_purchase_windows: false,
  ticket_parent_id: null,
  payment_constraints: [],
  sold_out_alert_enabled: false,
  sold_out_alert_recipients: [],
};

// ---- event ----------------------------------------------------------------------------------

// Eventbrite's Event object, returned unwrapped (no `event` envelope). Its
// multipart-text (`name`, `description`) and datetime-tz (`start`, `end`)
// fields are objects, so their leaves are declared as dot paths too — the
// workflow editor offers each one, e.g. `{{ steps.<id>.output.name.text }}`.
export const EVENT_OUTPUT: OutputField[] = [
  s("id", "Event ID"),
  o("name", "Name"),
  s("name.text", "Name (text)"),
  s("name.html", "Name (HTML)"),
  o("description", "Description"),
  s("description.text", "Description (text)"),
  s("description.html", "Description (HTML)"),
  s("summary", "Summary"),
  o("start", "Start"),
  s("start.utc", "Start (UTC)"),
  s("start.local", "Start (local)"),
  s("start.timezone", "Start timezone"),
  o("end", "End"),
  s("end.utc", "End (UTC)"),
  s("end.local", "End (local)"),
  s("end.timezone", "End timezone"),
  s("status", "Status"),
  s("url", "URL"),
  s("resource_uri", "Resource URI"),
  s("currency", "Currency"),
  n("capacity", "Capacity"),
  b("capacity_is_custom", "Custom capacity"),
  b("is_free", "Free event"),
  b("online_event", "Online event"),
  b("listed", "Listed"),
  b("shareable", "Shareable"),
  b("invite_only", "Invite only"),
  b("show_remaining", "Show remaining"),
  n("tx_time_limit", "Checkout time limit"),
  b("hide_start_date", "Hide start date"),
  b("hide_end_date", "Hide end date"),
  s("locale", "Locale"),
  b("is_locked", "Locked"),
  s("privacy_setting", "Privacy setting"),
  b("is_series", "Series"),
  b("is_series_parent", "Series parent"),
  s("inventory_type", "Inventory type"),
  b("is_reserved_seating", "Reserved seating"),
  b("show_pick_a_seat", "Show pick-a-seat"),
  b("show_seatmap_thumbnail", "Show seat map thumbnail"),
  b("show_colors_in_seatmap_thumbnail", "Show colors in seat map thumbnail"),
  b("is_externally_ticketed", "Externally ticketed"),
  s("source", "Source"),
  s("version", "Version"),
  s("created", "Created"),
  s("changed", "Changed"),
  s("published", "Published"),
  s("organization_id", "Organization ID"),
  s("organizer_id", "Organizer ID"),
  s("venue_id", "Venue ID"),
  s("category_id", "Category ID"),
  s("subcategory_id", "Subcategory ID"),
  s("format_id", "Format ID"),
  s("facebook_event_id", "Facebook event ID"),
  s("logo_id", "Logo ID"),
  o("logo", "Logo"),
  s("logo.id", "Logo image ID"),
  s("logo.url", "Logo URL"),
];

export const EVENT_SAMPLE = {
  id: ID.event,
  name: { text: "Launch Night", html: "Launch Night" },
  description: { text: "An example event.", html: "<p>An example event.</p>" },
  summary: "An example event.",
  start: {
    timezone: "America/Los_Angeles",
    utc: "2026-11-01T18:00:00Z",
    local: "2026-11-01T11:00:00",
  },
  end: {
    timezone: "America/Los_Angeles",
    utc: "2026-11-01T21:00:00Z",
    local: "2026-11-01T14:00:00",
  },
  status: "live",
  url: `https://www.eventbrite.com/e/launch-night-tickets-${ID.event}`,
  resource_uri: `${API}/events/${ID.event}/`,
  currency: "USD",
  capacity: 200,
  capacity_is_custom: true,
  is_free: false,
  online_event: false,
  listed: true,
  shareable: true,
  invite_only: false,
  show_remaining: false,
  tx_time_limit: 1200,
  hide_start_date: false,
  hide_end_date: false,
  locale: "en_US",
  is_locked: false,
  privacy_setting: "unlocked",
  is_series: false,
  is_series_parent: false,
  inventory_type: "limited",
  is_reserved_seating: false,
  show_pick_a_seat: false,
  show_seatmap_thumbnail: false,
  show_colors_in_seatmap_thumbnail: false,
  is_externally_ticketed: false,
  source: "api",
  version: null,
  created: "2026-10-01T09:00:00Z",
  changed: "2026-10-02T09:00:00Z",
  published: "2026-10-02T09:30:00Z",
  organization_id: ID.organization,
  organizer_id: ID.organizer,
  venue_id: ID.venue,
  category_id: null,
  subcategory_id: null,
  format_id: null,
  facebook_event_id: null,
  logo_id: ID.logo,
  logo: { id: ID.logo, url: "https://img.example.com/logo.png" },
};

/** A ticket class as an event's `ticket_classes` expansion inlines it (no sold-out alert fields). */
const INLINE_TICKET_CLASS_OUTPUT = TICKET_CLASS_OUTPUT.filter((f) =>
  !f.key.startsWith("sold_out_alert_")
);
const { sold_out_alert_enabled: _e, sold_out_alert_recipients: _r, ...INLINE_TICKET_CLASS_SAMPLE } =
  TICKET_CLASS_SAMPLE;

/** An event as `get-event` returns it with its default expansions (`venue`, `ticket_classes`). */
export const EVENT_EXPANDED_OUTPUT: OutputField[] = [
  ...EVENT_OUTPUT,
  o("venue", "Venue (expanded)"),
  ...prefixOutput("venue", VENUE_OUTPUT),
  a("ticket_classes", "Ticket classes (expanded)", INLINE_TICKET_CLASS_OUTPUT),
];

export const EVENT_EXPANDED_SAMPLE = {
  ...EVENT_SAMPLE,
  venue: VENUE_SAMPLE,
  ticket_classes: [INLINE_TICKET_CLASS_SAMPLE],
};

/**
 * An event inside a list (`list-events` expands `venue` and `ticket_classes` by default). Items are
 * one level, so the expanded ticket classes are a plain `array` here.
 */
export const EVENT_LIST_ITEM_OUTPUT: OutputField[] = [
  ...EVENT_OUTPUT,
  o("venue", "Venue (expanded)"),
  ...prefixOutput("venue", VENUE_OUTPUT),
  a("ticket_classes", "Ticket classes (expanded)"),
];

// ---- organizer, organization ----------------------------------------------------------------

export const ORGANIZER_OUTPUT: OutputField[] = [
  s("id", "Organizer ID"),
  s("name", "Name"),
  s("url", "URL"),
  s("resource_uri", "Resource URI"),
  o("description", "Description"),
  s("description.text", "Description (text)"),
  s("description.html", "Description (HTML)"),
  o("long_description", "Long description"),
  s("long_description.text", "Long description (text)"),
  s("long_description.html", "Long description (HTML)"),
  s("logo_id", "Logo ID"),
  n("num_past_events", "Past events"),
  n("num_future_events", "Future events"),
  s("twitter", "Twitter"),
  s("facebook", "Facebook"),
];

export const ORGANIZER_SAMPLE = {
  id: ID.organizer,
  name: "Example Events",
  url: `https://www.eventbrite.com/o/example-events-${ID.organizer}`,
  resource_uri: `${API}/organizers/${ID.organizer}/`,
  description: { text: "An example organizer.", html: "<p>An example organizer.</p>" },
  long_description: { text: "An example organizer.", html: "<p>An example organizer.</p>" },
  logo_id: ID.logo,
  num_past_events: 4,
  num_future_events: 2,
  twitter: "@example",
  facebook: "example",
};

export const ORGANIZATION_OUTPUT: OutputField[] = [
  s("_type", "Type"),
  s("id", "Organization ID"),
  s("parent_id", "Parent organization ID"),
  s("name", "Name"),
  s("image_id", "Image ID"),
  s("vertical", "Vertical"),
  s("locale", "Locale"),
  s("created", "Created"),
];

export const ORGANIZATION_SAMPLE = {
  _type: "organization",
  id: ID.organization,
  parent_id: null,
  name: "Example Organization",
  image_id: null,
  vertical: "default",
  locale: "en_US",
  created: "2026-01-01T09:00:00Z",
};

// ---- order, attendee ------------------------------------------------------------------------

const costs = (): OutputField[] => [
  o("costs", "Costs"),
  ...money("costs.base_price", "Base price"),
  ...money("costs.eventbrite_fee", "Eventbrite fee"),
  ...money("costs.gross", "Gross total"),
  ...money("costs.payment_fee", "Payment fee"),
  ...money("costs.tax", "Tax"),
];

const costsSample = {
  base_price: moneySample("$25.00", 2500),
  eventbrite_fee: moneySample("$1.50", 150),
  gross: moneySample("$26.50", 2650),
  payment_fee: moneySample("$0.00", 0),
  tax: moneySample("$0.00", 0),
};

export const ORDER_OUTPUT: OutputField[] = [
  s("id", "Order ID"),
  s("event_id", "Event ID"),
  s("name", "Buyer Name"),
  s("first_name", "Buyer First Name"),
  s("last_name", "Buyer Last Name"),
  s("email", "Buyer Email"),
  s("status", "Status"),
  s("created", "Created"),
  s("changed", "Changed"),
  n("time_remaining", "Time remaining"),
  s("resource_uri", "Resource URI"),
  ...costs(),
];

export const ORDER_SAMPLE = {
  id: ID.order,
  event_id: ID.event,
  name: "Alex Doe",
  first_name: "Alex",
  last_name: "Doe",
  email: "alex@example.com",
  status: "placed",
  created: "2026-10-08T09:00:00Z",
  changed: "2026-10-08T09:00:00Z",
  time_remaining: 0,
  resource_uri: `${API}/orders/${ID.order}/`,
  costs: costsSample,
};

/** An order inside `list-orders` (default expansions inline its attendees). */
export const ORDER_LIST_ITEM_OUTPUT: OutputField[] = [
  ...ORDER_OUTPUT,
  a("attendees", "Attendees (expanded)"),
];

export const ATTENDEE_OUTPUT: OutputField[] = [
  s("id", "Attendee ID"),
  s("event_id", "Event ID"),
  s("order_id", "Order ID"),
  o("profile", "Profile"),
  s("profile.name", "Name"),
  s("profile.first_name", "First name"),
  s("profile.last_name", "Last name"),
  s("profile.email", "Email"),
  s("ticket_class_id", "Ticket class ID"),
  s("ticket_class_name", "Ticket Class"),
  n("quantity", "Quantity"),
  s("status", "Status"),
  b("checked_in", "Checked In"),
  b("cancelled", "Cancelled"),
  b("refunded", "Refunded"),
  s("delivery_method", "Delivery method"),
  s("created", "Created"),
  s("changed", "Changed"),
  s("resource_uri", "Resource URI"),
  a("barcodes", "Barcodes"),
  a("answers", "Answers"),
  ...costs(),
];

export const ATTENDEE_SAMPLE = {
  id: ID.attendee,
  event_id: ID.event,
  order_id: ID.order,
  profile: {
    name: "Alex Doe",
    first_name: "Alex",
    last_name: "Doe",
    email: "alex@example.com",
  },
  ticket_class_id: ID.ticketClass,
  ticket_class_name: "General Admission",
  quantity: 1,
  status: "Attending",
  checked_in: false,
  cancelled: false,
  refunded: false,
  delivery_method: "electronic",
  created: "2026-10-08T09:00:00Z",
  changed: "2026-10-08T09:00:00Z",
  resource_uri: `${API}/events/${ID.event}/attendees/${ID.attendee}/`,
  barcodes: [],
  answers: [],
  costs: costsSample,
};

// ---- webhook --------------------------------------------------------------------------------

export const WEBHOOK_OUTPUT: OutputField[] = [
  s("id", "Webhook ID"),
  s("resource_uri", "Resource URI"),
  s("endpoint_url", "Endpoint URL"),
  a("actions", "Actions"),
  s("user_id", "Organization ID"),
  s("created", "Created"),
  s("event_id", "Event ID"),
];

export const WEBHOOK_SAMPLE = {
  id: ID.webhook,
  resource_uri: `${API}/webhooks/${ID.webhook}/`,
  endpoint_url: "https://hooks.example.com/eventbrite",
  actions: ["order.placed"],
  user_id: ID.user,
  created: "2026-10-08T09:00:00Z",
  event_id: ID.event,
};

// ---- trigger resources ----------------------------------------------------------------------

export type ResourceKind = "attendee" | "event" | "order" | "organizer" | "ticket_class" | "venue";

/** The record shape for each webhook resource type. */
export const RESOURCE_RECORD_OUTPUT: Record<ResourceKind, OutputField[]> = {
  order: ORDER_OUTPUT,
  attendee: ATTENDEE_OUTPUT,
  event: EVENT_OUTPUT,
  ticket_class: TICKET_CLASS_OUTPUT,
  organizer: ORGANIZER_OUTPUT,
  venue: VENUE_OUTPUT,
};

/** Downstream autocomplete for each record type, under `resource.`. */
export const RESOURCE_OUTPUT: Record<ResourceKind, OutputField[]> = {
  order: prefixOutput("resource", ORDER_OUTPUT),
  attendee: prefixOutput("resource", ATTENDEE_OUTPUT),
  event: prefixOutput("resource", EVENT_OUTPUT),
  ticket_class: prefixOutput("resource", TICKET_CLASS_OUTPUT),
  organizer: prefixOutput("resource", ORGANIZER_OUTPUT),
  venue: prefixOutput("resource", VENUE_OUTPUT),
};

/** One plausible record per type (and the API path it lives at), for a trigger's sample. */
export const RESOURCE_SAMPLE: Record<
  ResourceKind,
  { path: string; record: Record<string, unknown> }
> = {
  order: { path: `orders/${ID.order}`, record: ORDER_SAMPLE },
  attendee: { path: `events/${ID.event}/attendees/${ID.attendee}`, record: ATTENDEE_SAMPLE },
  event: { path: `events/${ID.event}`, record: EVENT_SAMPLE },
  ticket_class: {
    path: `events/${ID.event}/ticket_classes/${ID.ticketClass}`,
    record: TICKET_CLASS_SAMPLE,
  },
  organizer: { path: `organizers/${ID.organizer}`, record: ORGANIZER_SAMPLE },
  venue: { path: `venues/${ID.venue}`, record: VENUE_SAMPLE },
};

/** The delivery half of a trigger's sample. */
export const DELIVERY_SAMPLE = { webhookId: ID.webhook, userId: ID.user } as const;
