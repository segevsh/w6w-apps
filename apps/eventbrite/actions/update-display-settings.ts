import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

interface Input {
  eventId: string;
  showStartDate?: boolean;
  showEndDate?: boolean;
  showStartEndTime?: boolean;
  showTimezone?: boolean;
  showMap?: boolean;
  showRemaining?: boolean;
  showOrganizerFacebook?: boolean;
  showOrganizerTwitter?: boolean;
  showFacebookFriendsGoing?: boolean;
  terminology?: "tickets_vertical" | "endurance_vertical";
  extra?: Record<string, unknown>;
}

const action: ActionDefinition<Input> = {
  key: "update-display-settings",
  type: "perform",
  idempotent: true,
  resource: "event",
  title: "Update Display Settings",
  description:
    "Update the display settings of an event on Eventbrite (changes what the public event listing shows).",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "showStartDate", label: "Show start date", type: "boolean" },
    { key: "showEndDate", label: "Show end date", type: "boolean" },
    { key: "showStartEndTime", label: "Show start/end time", type: "boolean" },
    { key: "showTimezone", label: "Show timezone", type: "boolean" },
    { key: "showMap", label: "Show map", type: "boolean" },
    { key: "showRemaining", label: "Show remaining tickets", type: "boolean" },
    { key: "showOrganizerFacebook", label: "Show organizer Facebook link", type: "boolean" },
    { key: "showOrganizerTwitter", label: "Show organizer Twitter link", type: "boolean" },
    { key: "showFacebookFriendsGoing", label: "Show Facebook friends going", type: "boolean" },
    {
      key: "terminology",
      label: "Terminology",
      type: "select",
      options: [{ value: "tickets_vertical", label: "tickets_vertical" }, {
        value: "endurance_vertical",
        label: "endurance_vertical",
      }],
    },
    {
      key: "extra",
      label: "Additional fields",
      type: "json",
      hint:
        "Merged (deep) into the request object for any field not listed above, using Eventbrite's snake_case names.",
    },
  ],
  output: [
    { key: "show_start_date", type: "boolean", label: "Show start date" },
    { key: "show_end_date", type: "boolean", label: "Show end date" },
    { key: "show_start_end_time", type: "boolean", label: "Show start/end time" },
    { key: "show_timezone", type: "boolean", label: "Show timezone" },
    { key: "show_map", type: "boolean", label: "Show map" },
    { key: "show_remaining", type: "boolean", label: "Show remaining tickets" },
    { key: "show_organizer_facebook", type: "boolean", label: "Show organizer Facebook link" },
    { key: "show_organizer_twitter", type: "boolean", label: "Show organizer Twitter link" },
    { key: "show_facebook_friends_going", type: "boolean", label: "Show Facebook friends going" },
    { key: "terminology", type: "string", label: "Terminology" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    const obj: Record<string, unknown> = {};
    if (input.showStartDate !== undefined) obj.show_start_date = input.showStartDate;
    if (input.showEndDate !== undefined) obj.show_end_date = input.showEndDate;
    if (input.showStartEndTime !== undefined) obj.show_start_end_time = input.showStartEndTime;
    if (input.showTimezone !== undefined) obj.show_timezone = input.showTimezone;
    if (input.showMap !== undefined) obj.show_map = input.showMap;
    if (input.showRemaining !== undefined) obj.show_remaining = input.showRemaining;
    if (input.showOrganizerFacebook !== undefined) {
      obj.show_organizer_facebook = input.showOrganizerFacebook;
    }
    if (input.showOrganizerTwitter !== undefined) {
      obj.show_organizer_twitter = input.showOrganizerTwitter;
    }
    if (input.showFacebookFriendsGoing !== undefined) {
      obj.show_facebook_friends_going = input.showFacebookFriendsGoing;
    }
    if (input.terminology !== undefined) obj.terminology = input.terminology;
    if (input.extra) deepMerge(obj, input.extra);
    return await client.request(`/events/${enc(input.eventId)}/display_settings/`, {
      method: "POST",
      body: { display_settings: obj },
    });
  },
};

export default action;
