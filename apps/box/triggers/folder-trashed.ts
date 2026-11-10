import { boxTrigger } from "../lib/triggers.ts";

/** Box `FOLDER.TRASHED` on a watched folder. */
const folderTrashed = boxTrigger({
  key: "folder-trashed",
  title: "Folder Trashed",
  description:
    "Fires when a folder inside a Box folder you choose is moved to the trash. The run gets the folder's id, name, the person who did it and the time.",
  trigger: "FOLDER.TRASHED",
});

export default folderTrashed;
