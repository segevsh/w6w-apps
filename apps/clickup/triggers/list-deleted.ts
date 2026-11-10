import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "list-deleted",
  title: "List Deleted",
  description:
    "Fires when a List is deleted in a ClickUp Workspace, Space or Folder. The run gets the the deleted list's ID.",
  events: ["listDeleted"],
  sample: { taskId: null, listId: "162641285" },
});
