import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "list-created",
  title: "List Created",
  description:
    "Fires when a new List is created in a ClickUp Workspace, Space or Folder. The run gets the the new list's ID and the creation history.",
  events: ["listCreated"],
  sample: { taskId: null, listId: "162641285" },
});
