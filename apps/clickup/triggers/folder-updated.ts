import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "folder-updated",
  title: "Folder Updated",
  description:
    "Fires when a Folder is renamed or otherwise changed in a ClickUp Workspace or Space. The run gets the the folder ID and the before/after history.",
  events: ["folderUpdated"],
  sample: { taskId: null, listId: null, folderId: "96772212" },
});
