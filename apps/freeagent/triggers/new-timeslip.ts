import { sinceTrigger } from "../lib/triggers.ts";
import timeslipList from "../actions/timeslip-list.ts";

export default sinceTrigger({
  key: "new-timeslip",
  title: "New Timeslip",
  description: "The run gets each timeslip newly logged in FreeAgent.",
  action: timeslipList,
  itemsKey: "timeslips",
  input: (_p, w) => w,
  output: [
    { key: "url", type: "string", label: "Timeslip URL (its ID)" },
    { key: "user", type: "string", label: "User URL" },
    { key: "project", type: "string", label: "Project URL" },
    { key: "task", type: "string", label: "Task URL" },
    { key: "dated_on", type: "string", label: "Date" },
    { key: "hours", type: "string", label: "Hours" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    url: "https://api.freeagent.com/v2/timeslips/25",
    user: "https://api.freeagent.com/v2/users/1",
    project: "https://api.freeagent.com/v2/projects/1",
    task: "https://api.freeagent.com/v2/tasks/1",
    dated_on: "2026-11-09",
    hours: "7.5",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
});
