import { deltaTrigger } from "../lib/triggers.ts";

export default deltaTrigger({
  key: "new-folder",
  title: "New Folder",
  description:
    "The run gets a folder that was created in the drive (or directly inside one folder) since the trigger was switched on, from Microsoft Graph delta.",
  change: "created",
  facet: "folder",
});
