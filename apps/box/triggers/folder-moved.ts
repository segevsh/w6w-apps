import { boxTrigger } from "../lib/triggers.ts";

/** Box `FOLDER.MOVED` on a watched folder. */
const folderMoved = boxTrigger({
  key: "folder-moved",
  title: "Folder Moved",
  description:
    "Fires when a folder inside a Box folder you choose is moved to another folder. The run gets the folder's id, name, the person who did it and the time.",
  trigger: "FOLDER.MOVED",
});

export default folderMoved;
