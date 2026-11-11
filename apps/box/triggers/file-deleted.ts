import { boxTrigger } from "../lib/triggers.ts";

/** Box `FILE.DELETED` on a watched folder. */
const fileDeleted = boxTrigger({
  key: "file-deleted",
  title: "File Deleted",
  description:
    "Fires when a file in a Box folder you choose is permanently deleted. The run gets the file's id, name, the person who did it and the time.",
  trigger: "FILE.DELETED",
});

export default fileDeleted;
