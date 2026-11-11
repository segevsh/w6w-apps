import { boxTrigger } from "../lib/triggers.ts";

/** Box `FILE.COPIED` on a watched folder. */
const fileCopied = boxTrigger({
  key: "file-copied",
  title: "File Copied",
  description:
    "Fires when a file in a Box folder you choose is copied. The run gets the file's id, name, the person who did it and the time.",
  trigger: "FILE.COPIED",
});

export default fileCopied;
