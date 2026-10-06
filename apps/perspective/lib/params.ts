import type { Param } from "@w6w/types";

/** Shared `Param` fragments. Names and enums are copied from the Perspective reference. */

export const funnelIdParam: Param = {
  key: "funnelId",
  label: "Funnel ID",
  type: "string",
  required: true,
  placeholder: "fnl_xyz789",
  hint: "The campaign id from List Workspaces (`campaigns[].id`).",
};

export const contactIdParam: Param = {
  key: "contactId",
  label: "Contact ID",
  type: "string",
  required: true,
  placeholder: "cnt_abc123",
};

const dateHint = "ISO 8601, e.g. 2025-01-01T00:00:00.000Z.";

export const fromParam: Param = {
  key: "from",
  label: "From",
  type: "string",
  required: true,
  hint: `Start of the period. ${dateHint} Must be before To.`,
};

export const toParam: Param = {
  key: "to",
  label: "To",
  type: "string",
  required: true,
  hint: `End of the period. ${dateHint}`,
};

export const offsetParam: Param = {
  key: "offset",
  label: "Timezone offset (minutes)",
  type: "string",
  hint: "Minutes from UTC, e.g. -120 for UTC-2. An optional leading + or - is accepted.",
};

export const kpiSubtypeOptions = [
  { value: "kpi_conversion_rate", label: "Conversion rate (%)" },
  { value: "kpi_completion_rate", label: "Completion rate (%)" },
  { value: "kpi_average_time_on_page", label: "Average time on page (seconds)" },
  { value: "kpi_time_to_completion", label: "Time to completion (seconds)" },
  { value: "kpi_new_contacts", label: "New contacts (count)" },
  { value: "kpi_total_sessions", label: "Total sessions (count)" },
  { value: "kpi_messages_sent", label: "Messages sent (count)" },
  { value: "kpi_messages_delivery_rate", label: "Message delivery rate (%)" },
  { value: "kpi_messages_open_rate", label: "Message open rate (%)" },
];

export const chartSubtypeOptions = [
  { value: "chart_page_to_page_conversion_rate", label: "Page-to-page conversion rate" },
  { value: "chart_activity_by_daytime", label: "Activity by day and hour" },
  { value: "chart_contacts_over_time", label: "Contacts over time" },
  { value: "chart_visitor_devices", label: "Visitor devices" },
  { value: "chart_top_utm_sources", label: "Top UTM sources" },
  { value: "chart_time_on_page", label: "Time on page" },
  { value: "chart_button_clicks", label: "Button clicks" },
];

export const contactSortFieldOptions = [
  { value: "ps_converted_at", label: "Converted at (default)" },
  { value: "email", label: "Email" },
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
];
