import { deltaTrigger } from "../lib/triggers.ts";

export default deltaTrigger({
  key: "file-updated",
  title: "File Updated",
  description:
    "The run gets a file that already existed and was modified, renamed or moved in the drive (or directly inside one folder), from Microsoft Graph delta.",
  change: "updated",
  facet: "file",
});
