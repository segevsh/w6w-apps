import type { TriggerDefinition } from "@w6w/types";
import { pollNewActivities } from "../lib/polls.ts";

/**
 * Copper's `POST /activities/search` documents an activity-date window (`minimum_activity_date`)
 * and no sort order (https://developer.copper.com/activities/list-activities-search.html,
 * 2026-11-10), so this is a since-filter poll: each check re-reads the window from the last
 * check minus a 120 s overlap and dedupes by activity id. An activity logged with an activity
 * date older than that window is not seen.
 */
const trigger: TriggerDefinition = {
  key: "new-activity",
  title: "New Activity",
  description:
    "The run gets each note, call, meeting or system event logged in Copper after the trigger is on.",
  output: [
    { key: "id", type: "number", label: "Activity ID" },
    { key: "parent", type: "object", label: "Parent record ({id, type})" },
    { key: "type", type: "object", label: "Activity type ({id, category})" },
    { key: "user_id", type: "number", label: "User ID" },
    { key: "details", type: "string", label: "Details" },
    { key: "activity_date", type: "number", label: "Activity date (Unix seconds)" },
    { key: "date_created", type: "number", label: "Created (Unix seconds)" },
    { key: "date_modified", type: "number", label: "Modified (Unix seconds)" },
  ],
  sample: {
    id: 3064242278,
    parent: { id: 27140359, type: "person" },
    type: { id: 0, category: "user" },
    user_id: 137658,
    details: "This is the description of this note",
    activity_date: 1496772355,
    old_value: null,
    new_value: null,
    date_created: 1496772355,
    date_modified: 1496772355,
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollNewActivities(state, ctx);
  },
};

export default trigger;
