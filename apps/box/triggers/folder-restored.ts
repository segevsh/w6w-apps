import { boxTrigger } from "../lib/triggers.ts";

/** Box `FOLDER.RESTORED` on a watched folder. */
const folderRestored = boxTrigger({
  key: "folder-restored",
  title: "Folder Restored",
  description:
    "Fires when a folder inside a Box folder you choose is restored from the trash. The run gets the folder's id, name, the person who did it and the time.",
  trigger: "FOLDER.RESTORED",
});

export default folderRestored;
