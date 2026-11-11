import { deltaTrigger } from "../lib/triggers.ts";

export default deltaTrigger({
  key: "new-file",
  title: "New File",
  description:
    "The run gets a file that was created in the drive (or directly inside one folder) since the trigger was switched on, from Microsoft Graph delta.",
  change: "created",
  facet: "file",
});
