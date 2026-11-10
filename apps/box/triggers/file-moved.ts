import { boxTrigger } from "../lib/triggers.ts";

/** Box `FILE.MOVED` on a watched folder. */
const fileMoved = boxTrigger({
  key: "file-moved",
  title: "File Moved",
  description:
    "Fires when a file in a Box folder you choose is moved to another folder. The run gets the file's id, name, the person who did it and the time.",
  trigger: "FILE.MOVED",
});

export default fileMoved;
