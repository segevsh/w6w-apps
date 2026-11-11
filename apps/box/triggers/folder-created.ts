import { boxTrigger } from "../lib/triggers.ts";

/** Box `FOLDER.CREATED` on a watched folder. */
const folderCreated = boxTrigger({
  key: "folder-created",
  title: "Folder Created",
  description:
    "Fires when a folder is created inside a Box folder you choose. The run gets the folder's id, name, the person who did it and the time.",
  trigger: "FOLDER.CREATED",
});

export default folderCreated;
