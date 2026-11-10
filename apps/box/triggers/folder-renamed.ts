import { boxTrigger } from "../lib/triggers.ts";

/** Box `FOLDER.RENAMED` on a watched folder. */
const folderRenamed = boxTrigger({
  key: "folder-renamed",
  title: "Folder Renamed",
  description:
    "Fires when a folder inside a Box folder you choose is renamed. The run gets the folder's id, name, the person who did it and the time.",
  trigger: "FOLDER.RENAMED",
});

export default folderRenamed;
