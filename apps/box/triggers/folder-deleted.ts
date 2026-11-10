import { boxTrigger } from "../lib/triggers.ts";

/** Box `FOLDER.DELETED` on a watched folder. */
const folderDeleted = boxTrigger({
  key: "folder-deleted",
  title: "Folder Deleted",
  description:
    "Fires when a folder inside a Box folder you choose is permanently deleted. The run gets the folder's id, name, the person who did it and the time.",
  trigger: "FOLDER.DELETED",
});

export default folderDeleted;
