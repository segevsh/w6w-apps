import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/list-sessions.ts";

/** `GET /consultant/sessions`: "Sessions are returned in descending order, with the most recent sessions appearing first based on date created." (https://api-docs.practicebetter.io/swagger.json, verified 2026-11-10). */
export default pollFromListAction({
  key: "new-session",
  title: "New Session",
  description: "The run gets each newly created session.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Session ID",
    },
    {
      "key": "dateCreated",
      "type": "string",
      "label": "Created at",
    },
    {
      "key": "cancelled",
      "type": "boolean",
      "label": "Cancelled",
    },
  ],
  sample: {
    "id": "ses-1",
    "dateCreated": "2026-11-10T09:00:00Z",
    "cancelled": false,
  },
  maxPages: 1,
});
