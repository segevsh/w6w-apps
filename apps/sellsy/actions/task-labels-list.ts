import { listAction } from "../lib/actions.ts";

export default listAction({
  "key": "task-labels-list",
  "noun": "task labels",
  "path": "/tasks/labels",
  "scope": "tasks.read",
  "orders": [
    "rank",
    "id",
  ],
});
