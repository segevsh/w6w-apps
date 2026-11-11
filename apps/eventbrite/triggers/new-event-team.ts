import { snapshotTrigger } from "../lib/polls.ts";
import listEventTeams from "../actions/list-event-teams.ts";
import { TEAM_OUTPUT, TEAM_SAMPLE } from "../lib/outputs.ts";

/**
 * Eventbrite sends no webhook for event teams, and an event has a bounded number of them, so the
 * whole list (`GET /events/{id}/teams/`, read by `list-event-teams`) is compared check to check.
 * `search-event-teams` returns the same team records filtered by name, so it is covered here.
 * https://www.eventbrite.com/platform/api (verified 2026-11-10).
 */
const newEventTeam = snapshotTrigger({
  key: "new-event-team",
  title: "New Event Team",
  description:
    "Checks an event's teams on a schedule. The run gets each team created since the previous check: its name, join token and attendee count.",
  action: listEventTeams,
  list: "teams",
  paged: true,
  params: [{
    key: "eventId",
    label: "Event ID",
    type: "string",
    required: true,
    hint: "The event to watch.",
  }],
  input: (p) => ({ eventId: String(p.eventId ?? "").trim() }),
  output: TEAM_OUTPUT,
  sample: TEAM_SAMPLE,
});

export default newEventTeam;
