import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/list-reminders.ts";

/** `GET /consultant/reminders`: "Tasks are returned in descending order, with the most recent tasks appearing first based on date created." (https://api-docs.practicebetter.io/swagger.json, verified 2026-11-10). */
export default pollFromListAction({
  key: "new-reminder",
  title: "New Reminder",
  description: "The run gets each newly created reminder (task).",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Reminder ID",
    },
    {
      "key": "completed",
      "type": "boolean",
      "label": "Completed",
    },
    {
      "key": "dueDate",
      "type": "string",
      "label": "Due date",
    },
  ],
  sample: {
    "id": "rem-1",
    "completed": false,
    "dueDate": "2026-11-12T09:00:00Z",
  },
  maxPages: 1,
});
