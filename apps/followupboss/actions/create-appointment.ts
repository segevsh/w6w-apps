import type { ActionDefinition } from "@w6w/types";
import { compact, FubClient } from "../lib/client.ts";

interface Input {
  title: string;
  start: string;
  end: string;
  description?: string;
  invitees?: unknown;
  allDay?: boolean;
  location?: string;
  typeId?: number;
  outcomeId?: number;
  createdById?: number;
  sendInvitation?: boolean;
}

/**
 * `POST /appointments` — create an appointment (a showing, a listing
 * presentation, a closing).
 *
 * `title`, `start` and `end` are the schema's three required fields.
 *
 * ## `invitees` mixes two different object shapes
 *
 * The list "can contain both `/people` or `/users` objects", and they are keyed
 * differently — `{userId: 1, name: "Tom Minch"}` for an agent,
 * `{personId: 3, name: "John Q"}` for a contact. One array, two shapes, and
 * getting the key wrong silently invites nobody.
 *
 * ## Calendar sync has a precondition worth stating
 *
 * "Appointments created in Follow Up Boss will sync with Third-Party Calendars
 * (Gmail, Outlook), but **only** if the `invitees` list contains the Follow Up
 * Boss `user` with a properly synced calendar as well as any other invitees."
 * So an appointment created with only the client as an invitee is real in Follow
 * Up Boss and invisible in the agent's Google Calendar — which is exactly the
 * failure that gets reported as "the integration didn't create the event".
 *
 * `typeId` and `outcomeId` are ids from the `/appointmentTypes` and
 * `/appointmentOutcomes` endpoints. Those two metadata collections are not
 * shipped as their own actions — see the README's "What is deliberately not
 * here" — so the hints name the endpoints rather than pointing at an action that
 * does not exist.
 */
const createAppointment: ActionDefinition<Input> = {
  key: "create-appointment",
  type: "perform",
  resource: "appointment",
  title: "Create Appointment",
  idempotent: false,
  description:
    "Create an appointment — a showing, listing presentation or closing. To have it sync to the " +
    "agent's Google or Outlook calendar, the agent's own user must be among the invitees.",
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "start",
      label: "Start",
      type: "string",
      required: true,
      hint: "Start date/time in UTC; a timezone suffix is also accepted.",
    },
    {
      key: "end",
      label: "End",
      type: "string",
      required: true,
      hint: "End date/time in UTC; a timezone suffix is also accepted.",
    },
    {
      key: "invitees",
      label: "Invitees",
      type: "json",
      hint: "JSON array mixing agents and contacts, which are keyed differently: " +
        '`[{"userId": 1, "name": "Tom Minch"}, {"personId": 44673, "name": "John Q"}]`. ' +
        "**Include the agent's own user entry** or the appointment will not sync to their " +
        "Google/Outlook calendar.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "location",
      label: "Location",
      type: "string",
      hint: "Address or location of the appointment.",
    },
    {
      key: "allDay",
      label: "All day",
      type: "boolean",
      advanced: true,
      hint: "Mark as an all-day event.",
    },
    {
      key: "typeId",
      label: "Appointment type id",
      type: "number",
      advanced: true,
      hint: "What kind of appointment this is. Ids come from the `/appointmentTypes` endpoint.",
    },
    {
      key: "outcomeId",
      label: "Appointment outcome id",
      type: "number",
      advanced: true,
      hint: "How the appointment went. Ids come from the `/appointmentOutcomes` endpoint.",
    },
    {
      key: "createdById",
      label: "Created by user id",
      type: "number",
      advanced: true,
      hint: "Attribute creation to another agent. **Only an admin's key can set this** — " +
        "otherwise the authenticating user is used regardless.",
    },
    {
      key: "sendInvitation",
      label: "Send invitation",
      type: "boolean",
      advanced: true,
      hint: "Email the invitees. If the account has appointment reminders enabled, an SMS " +
        "reminder is sent too. Sent as a query parameter.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Appointment id" }],

  execute(input, ctx) {
    return new FubClient(ctx).request("/appointments", {
      method: "POST",
      query: { sendInvitation: input.sendInvitation },
      body: compact({
        title: input.title,
        description: input.description,
        invitees: input.invitees,
        allDay: input.allDay,
        start: input.start,
        end: input.end,
        location: input.location,
        createdById: input.createdById,
        typeId: input.typeId,
        outcomeId: input.outcomeId,
      }),
    });
  },
};

export default createAppointment;
