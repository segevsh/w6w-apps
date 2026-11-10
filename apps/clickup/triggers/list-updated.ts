import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "list-updated",
  title: "List Updated",
  description:
    "Fires when a List is renamed or otherwise changed in a ClickUp Workspace, Space or Folder. The run gets the the list ID and the before/after history.",
  events: ["listUpdated"],
  sample: { taskId: null, listId: "162641285" },
});
