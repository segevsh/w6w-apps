import { listTrigger } from "../lib/list-trigger.ts";

export default listTrigger({
  key: "new-list",
  title: "New List",
  description: "The run gets each contact or company list created since the last check.",
  updated: false,
});
