import type { ActionDefinition } from "@w6w/types";
import {
  FubClient,
  type FubList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  personId?: number;
  userId?: number;
  start?: string;
  end?: string;
}

/**
 * `GET /appointments` — search appointments.
 *
 * ## The three conditions that decide whether anything comes back
 *
 * This endpoint returns far less than people expect, and the reason is stated
 * plainly in its documentation. An appointment appears only if **all three** of
 * these hold:
 *
 *   1. "The appointment has to belong to the person making the request. (i.e.,
 *      the API key used to authenticate matches with who created the
 *      appointment)"
 *   2. "The appointment has to be created in Follow Up Boss. (i.e., not coming
 *      from a Google calendar sync)"
 *   3. "The user who created the appointment has to be sharing their calendar."
 *
 * Condition 1 is the surprising one: this is not an account-wide calendar read
 * even with an owner's key — it is scoped to appointments the *authenticating
 * user* created. Condition 2 excludes anything synced in from Google or Outlook,
 * which in a real brokerage is often most of the calendar.
 *
 * An empty result here is therefore usually a scoping artefact, not an empty
 * calendar. That is worth saying at the form, because the natural conclusion
 * ("the integration is broken") is wrong.
 *
 * `start` and `end` are documented as a pair — each "must be combined with" the
 * other — so a half-specified window is not a valid filter.
 */
const searchAppointments: ActionDefinition<Input> = {
  key: "search-appointments",
  type: "search",
  resource: "appointment",
  title: "Search Appointments",
  description:
    "Search appointments by person, user or date window. Returns far less than the full " +
    "calendar by design: only appointments created by the authenticating user, created inside " +
    "Follow Up Boss (not synced from Google/Outlook), by a user sharing their calendar. An " +
    "empty result is usually this scoping, not an empty calendar.",
  params: [
    {
      key: "personId",
      label: "Person id",
      type: "number",
      hint: "Appointments involving this contact. Comma-separated ids are accepted.",
    },
    {
      key: "userId",
      label: "User id",
      type: "number",
      hint: "Appointments involving this agent.",
    },
    {
      key: "start",
      label: "Window start",
      type: "string",
      hint: "Start of the date/time range. **Must be paired with Window end** — one alone is not " +
        "a valid filter.",
    },
    {
      key: "end",
      label: "Window end",
      type: "string",
      hint: "End of the date/time range. Must be paired with Window start.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx): Promise<FubList> {
    return new FubClient(ctx).list("/appointments", {
      query: {
        ...pageQuery(input),
        personId: input.personId,
        userId: input.userId,
        start: input.start,
        end: input.end,
      },
    });
  },
};

export default searchAppointments;
