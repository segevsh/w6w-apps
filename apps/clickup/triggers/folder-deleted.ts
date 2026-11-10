import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "folder-deleted",
  title: "Folder Deleted",
  description:
    "Fires when a Folder is deleted in a ClickUp Workspace or Space. The run gets the the deleted folder's ID.",
  events: ["folderDeleted"],
  sample: { taskId: null, listId: null, folderId: "96772212" },
});
