import { listTrigger } from "../lib/list-trigger.ts";

export default listTrigger({
  key: "new-or-updated-list",
  title: "New or Updated List",
  description: "The run gets each new list and each list that was renamed or changed.",
  updated: true,
});
