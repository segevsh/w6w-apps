import { boxTrigger } from "../lib/triggers.ts";

/** Box `FILE.RENAMED` on a watched folder. */
const fileRenamed = boxTrigger({
  key: "file-renamed",
  title: "File Renamed",
  description:
    "Fires when a file in a Box folder you choose is renamed. The run gets the file's id, name, the person who did it and the time.",
  trigger: "FILE.RENAMED",
});

export default fileRenamed;
