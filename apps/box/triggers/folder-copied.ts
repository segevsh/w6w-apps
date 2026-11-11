import { boxTrigger } from "../lib/triggers.ts";

/** Box `FOLDER.COPIED` on a watched folder. */
const folderCopied = boxTrigger({
  key: "folder-copied",
  title: "Folder Copied",
  description:
    "Fires when a folder inside a Box folder you choose is copied. The run gets the folder's id, name, the person who did it and the time.",
  trigger: "FOLDER.COPIED",
});

export default folderCopied;
