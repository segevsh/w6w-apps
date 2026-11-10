import { boxTrigger } from "../lib/triggers.ts";

/** Box `FILE.RESTORED` on a watched folder. */
const fileRestored = boxTrigger({
  key: "file-restored",
  title: "File Restored",
  description:
    "Fires when a file in a Box folder you choose is restored from the trash. The run gets the file's id, name, the person who did it and the time.",
  trigger: "FILE.RESTORED",
});

export default fileRestored;
