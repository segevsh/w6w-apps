import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";
import { DISPLAY_SETTINGS_OUTPUT, DISPLAY_SETTINGS_SAMPLE } from "../lib/outputs.ts";

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
  output: [...DISPLAY_SETTINGS_OUTPUT],
  sample: DISPLAY_SETTINGS_SAMPLE,

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
