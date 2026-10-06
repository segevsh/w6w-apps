import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/taskType` - lists the task types. */
export default lookupAction({
  key: "list-task-types",
  title: "List Task Types",
  description: "List the task types.",
  path: "/zapier/taskType",
});
