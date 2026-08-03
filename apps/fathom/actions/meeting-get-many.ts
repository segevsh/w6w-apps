import type { ActionDefinition } from "@w6w/types";
import { FathomClient, type ListResult } from "../lib/client.ts";
import { cursorParam, inviteeDomainsTypeOptions, listOutput } from "../lib/params.ts";

interface Input {
  cursor?: string;
  createdAfter?: string;
  createdBefore?: string;
  recordedBy?: string[];
  teams?: string[];
  meetingType?: string;
  calendarInviteesDomains?: string[];
  calendarInviteesDomainsType?: string;
  includeTranscript?: boolean;
  includeSummary?: boolean;
  includeActionItems?: boolean;
  includeHighlights?: boolean;
  includeCrmMatches?: boolean;
}

/**
 * `GET /meetings` — the account's meetings, newest first, cursor-paginated.
 *
 * This is the app's centre of gravity: a meeting carries its title, calendar
 * metadata, recording window, `recording_id`, share URL, invitees and recorder,
 * and — when the matching `include_*` flag is set — its transcript, default
 * summary, action items, highlights and CRM matches, all in one call.
 *
 * Two things worth knowing before setting the flags:
 *
 *   - `include_summary` and `include_transcript` make this a **heavy** request
 *     (30 calls / 60s, dropping to 5 during elevated activity) rather than a
 *     normal one (60 / 60s). Leave them off when paging through a backlog and
 *     fetch the bodies per recording instead.
 *   - Fathom documents both as **unavailable to OAuth-connected apps** — those
 *     must use the `/recordings/{id}/…` endpoints. This app authenticates with
 *     an API key, so both work, but a workflow meant to survive a future OAuth
 *     connection should prefer Get Recording Summary / Transcript.
 */
const meetingGetMany: ActionDefinition<Input, ListResult> = {
  key: "meeting-get-many",
  type: "search",
  resource: "meeting",
  title: "Get Many Meetings",
  description:
    "List meetings recorded by or shared with this account, optionally including transcripts, summaries, action items, highlights and CRM matches.",
  params: [
    cursorParam,
    {
      key: "createdAfter",
      label: "Created after",
      type: "datetime",
      hint: "Only meetings whose `created_at` is after this instant, e.g. 2025-01-01T00:00:00Z.",
    },
    {
      key: "createdBefore",
      label: "Created before",
      type: "datetime",
      hint: "Only meetings whose `created_at` is before this instant, e.g. 2025-01-01T00:00:00Z.",
    },
    {
      key: "recordedBy",
      label: "Recorded by",
      type: "multiselect",
      hint:
        "Email addresses of the users who recorded the meetings. With neither this nor Teams set, meetings from users outside your org are excluded.",
    },
    {
      key: "teams",
      label: "Teams",
      type: "multiselect",
      hint: "Team names. Names come from Get Many Teams.",
    },
    {
      key: "meetingType",
      label: "Meeting type",
      type: "string",
      hint:
        "Exact meeting-type name from Get Many Meeting Types. An unknown name returns an empty list.",
    },
    {
      key: "calendarInviteesDomains",
      label: "Invitee company domains",
      type: "multiselect",
      hint:
        "Exact email domains of the associated company, e.g. acme.com. A meeting is associated with only one company.",
    },
    {
      key: "calendarInviteesDomainsType",
      label: "Invitee domain type",
      type: "select",
      options: inviteeDomainsTypeOptions,
      hint:
        "Whether the calendar invitee list includes external domains. Fathom defaults to `all`.",
    },
    {
      key: "includeTranscript",
      label: "Include transcript",
      type: "boolean",
      default: false,
      hint: "Heavy request (30/60s). Not available to OAuth-connected apps.",
    },
    {
      key: "includeSummary",
      label: "Include summary",
      type: "boolean",
      default: false,
      hint: "Heavy request (30/60s). Not available to OAuth-connected apps.",
    },
    {
      key: "includeActionItems",
      label: "Include action items",
      type: "boolean",
      default: false,
    },
    {
      key: "includeHighlights",
      label: "Include highlights",
      type: "boolean",
      default: false,
    },
    {
      key: "includeCrmMatches",
      label: "Include CRM matches",
      type: "boolean",
      default: false,
      hint: "Only returns data from your or your team's linked CRM.",
    },
  ],
  output: listOutput,

  execute(input, ctx) {
    return new FathomClient(ctx).list("/meetings", {
      query: {
        cursor: input.cursor,
        created_after: input.createdAfter,
        created_before: input.createdBefore,
        recorded_by: input.recordedBy,
        teams: input.teams,
        meeting_type: input.meetingType,
        calendar_invitees_domains: input.calendarInviteesDomains,
        calendar_invitees_domains_type: input.calendarInviteesDomainsType,
        include_transcript: input.includeTranscript,
        include_summary: input.includeSummary,
        include_action_items: input.includeActionItems,
        include_highlights: input.includeHighlights,
        include_crm_matches: input.includeCrmMatches,
      },
    });
  },
};

export default meetingGetMany;
