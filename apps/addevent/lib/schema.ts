/**
 * Response shapes, copied field-for-field from the `components.schemas` section of
 * AddEvent's OpenAPI 3.1 document (`v2.14.0`). Every field here is the vendor's own
 * name — nothing is renamed or reshaped on the way through.
 */

export interface AddEventRsvpSettings {
  rsvp_form_id?: string;
  seats_limited?: boolean;
  seats_limit?: number;
  inactive?: boolean;
  notify_emails?: string;
  notify_frequency?: string;
}

export interface AddEventRsvpStats {
  seats_left?: number;
  count_total?: number;
  count_going?: number;
  count_maybe?: number;
  count_cantgo?: number;
}

export interface AddEventEvent {
  id?: string;
  unique_key?: string;
  title?: string;
  calendar_id?: string | number;
  datetime_start?: string;
  datetime_end?: string;
  all_day_event?: boolean;
  timezone?: string;
  recurring_rule?: string;
  description?: string;
  internal_name?: string;
  location?: string;
  location_id?: number;
  organizer_name?: string;
  organizer_email?: string;
  reminder?: number;
  color?: number;
  free_busy?: string;
  landing_page_template_id?: string;
  rsvp_enabled?: boolean;
  rsvp?: { settings?: AddEventRsvpSettings; stats?: AddEventRsvpStats };
  custom_data?: Record<string, unknown>;
  link_long?: string;
  link_short?: string;
  created?: string;
  modified?: string;
}

export interface AddEventCalendarStats {
  subscriber_active_count?: number;
  subscribers_all_count?: number;
  events_count?: number;
}

export interface AddEventCalendar {
  id?: string;
  unique_key?: string;
  title?: string;
  timezone?: string;
  weekday_begin?: string;
  is_default_calendar?: boolean;
  description?: string;
  internal_name?: string;
  calendar_color?: number;
  palette_id?: string;
  landing_page_template_id?: string;
  embeddable_calendar_template_id?: string;
  stats?: AddEventCalendarStats;
  custom_data?: Record<string, unknown>;
  link_long?: string;
  link_short?: string;
  created?: string;
  modified?: string;
}

export interface AddEventGeolocation {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  location?: string;
  postal?: string;
}

export interface AddEventAttendee {
  id?: string;
  event_id?: string;
  email?: string;
  attending?: string;
  rsvp_form_data?: Record<string, unknown>;
  rsvp_form_labels?: Record<string, unknown>;
  geo_location?: AddEventGeolocation;
  created?: string;
  modified?: string;
}

export interface AddEventSubscriber {
  id?: string;
  calendar_id?: string;
  subscriber_status?: string;
  calendar_type?: string;
  sync_count?: number;
  synced?: string;
  subscriber_form_data?: Record<string, unknown>;
  subscriber_form_labels?: Record<string, unknown>;
  geo_location?: AddEventGeolocation;
  created?: string;
}

export interface AddEventTimezone {
  name?: string;
  local_time?: string;
  is_dst?: boolean;
  utc_offset?: number;
  utc_offset_hours?: string;
  tzid_abbr?: string;
}

export interface AddEventRsvpForm {
  id?: string;
  name?: string;
  created?: string;
  modified?: string;
}

export interface AddEventTemplate {
  id?: string;
  name?: string;
  template_type?: string;
  created?: string;
  modified?: string;
}
