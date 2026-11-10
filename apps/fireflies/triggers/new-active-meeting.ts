import type { ActionDefinition } from "@w6w/types";
import activeMeetingList from "../actions/active-meeting-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `active_meetings` lists the meetings the notetaker is in right now. A meeting appears while it
 * is live and leaves the list when it ends, so each check emits the meetings that were not live at
 * the previous check (a meeting that starts and ends between two checks is not seen).
 * https://docs.fireflies.ai/graphql-api/query/active-meetings */
export default snapshotTrigger({
  key: "new-active-meeting",
  title: "Notetaker Joined a Meeting",
  description: "The run gets each meeting the Fireflies notetaker has newly joined.",
  action: activeMeetingList as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { active_meetings?: unknown[] }).active_meetings ?? [],
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Meeting ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "organizer_email", type: "string", label: "Organizer email" },
    { key: "meeting_link", type: "string", label: "Meeting link" },
    { key: "start_time", type: "string", label: "Start time" },
    { key: "state", type: "string", label: "State" },
  ],
  sample: {
    id: "meeting-1",
    title: "Weekly sync",
    organizer_email: "ada@example.com",
    meeting_link: "https://meet.example.com/abc",
    start_time: "2026-11-10T09:00:00.000Z",
    state: "active",
  },
});
