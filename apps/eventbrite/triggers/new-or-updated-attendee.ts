import { newOrUpdatedAttendeeTrigger } from "../lib/polls.ts";
import listAttendees from "../actions/list-attendees.ts";
import { ATTENDEE_OUTPUT, ATTENDEE_SAMPLE } from "../lib/outputs.ts";

/**
 * `GET /organizations/{id}/attendees/?changed_since=…` (or `/events/{id}/attendees/`), read by
 * `list-attendees`: "Filter Attendees changed on or after the specified time"
 * (https://www.eventbrite.com/platform/api, verified 2026-11-10). The webhook triggers only name an
 * attendee's edits and check-ins; this one also sees an attendee the first time it exists, and any
 * later change, and is the safety net for a webhook delivery that never arrived.
 */
const newOrUpdatedAttendee = newOrUpdatedAttendeeTrigger({
  key: "new-or-updated-attendee",
  title: "New or Updated Attendee",
  description:
    "Checks an organization's or event's attendees on a schedule. The run gets each attendee that is new or changed since the previous check, with its profile, ticket class and check-in state.",
  action: listAttendees,
  params: [
    {
      key: "scope",
      label: "Watch",
      type: "select",
      required: true,
      default: "organization",
      options: [
        { value: "organization", label: "An organization" },
        { value: "event", label: "One event" },
      ],
    },
    {
      key: "scopeId",
      label: "Organization or event ID",
      type: "string",
      required: true,
      hint: "The organization ID, or the event ID when watching one event.",
    },
  ],
  output: ATTENDEE_OUTPUT,
  sample: ATTENDEE_SAMPLE,
});

export default newOrUpdatedAttendee;
