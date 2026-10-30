import type { Option } from "@w6w/types";

// Event and Order expansion tables in the checked-in Eventbrite API reference.
// Keep ticket_classes, the existing event default, available alongside those fields.
export const EVENT_EXPANSIONS: Option[] = [
  { value: "venue", label: "Venue" },
  { value: "ticket_classes", label: "Ticket classes" },
  { value: "logo", label: "Logo" },
  { value: "organizer", label: "Organizer" },
  { value: "format", label: "Format" },
  { value: "category", label: "Category" },
  { value: "subcategory", label: "Subcategory" },
  { value: "bookmark_info", label: "Bookmark information" },
  { value: "refund_policy", label: "Refund policy" },
  { value: "ticket_availability", label: "Ticket availability" },
  { value: "external_ticketing", label: "External ticketing" },
  { value: "music_properties", label: "Music properties" },
  { value: "publish_settings", label: "Publish settings" },
  { value: "basic_inventory_info", label: "Basic inventory information" },
  { value: "event_sales_status", label: "Event sales status" },
  { value: "checkout_settings", label: "Checkout settings" },
  { value: "listing_properties", label: "Listing properties" },
  { value: "has_digital_content", label: "Has digital content" },
];

export const ORDER_EXPANSIONS: Option[] = [
  { value: "event", label: "Event" },
  { value: "attendees", label: "Attendees" },
  { value: "merchandise", label: "Merchandise" },
  { value: "concierge", label: "Concierge" },
  { value: "refund_requests", label: "Refund requests" },
  { value: "survey", label: "Survey" },
  { value: "survey_responses", label: "Survey responses" },
  { value: "answers", label: "Answers" },
  { value: "ticket_buyer_settings", label: "Ticket buyer settings" },
  { value: "contact_list_preferences", label: "Contact list preferences" },
];
