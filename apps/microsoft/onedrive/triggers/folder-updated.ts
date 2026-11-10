import { deltaTrigger } from "../lib/triggers.ts";

export default deltaTrigger({
  key: "folder-updated",
  title: "Folder Updated",
  description:
    "The run gets a folder that already existed and was modified, renamed or moved in the drive (or directly inside one folder), from Microsoft Graph delta.",
  change: "updated",
  facet: "folder",
});
