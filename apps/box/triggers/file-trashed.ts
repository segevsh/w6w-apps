import { boxTrigger } from "../lib/triggers.ts";

/** Box `FILE.TRASHED` on a watched folder. */
const fileTrashed = boxTrigger({
  key: "file-trashed",
  title: "File Trashed",
  description:
    "Fires when a file in a Box folder you choose is moved to the trash. The run gets the file's id, name, the person who did it and the time.",
  trigger: "FILE.TRASHED",
});

export default fileTrashed;
