import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "folder-created",
  title: "Folder Created",
  description:
    "Fires when a new Folder is created in a ClickUp Workspace or Space. The run gets the the new folder's ID and the creation history.",
  events: ["folderCreated"],
  sample: { taskId: null, listId: null, folderId: "96772212" },
});
