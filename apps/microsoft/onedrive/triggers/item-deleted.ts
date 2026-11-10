import { deltaTrigger } from "../lib/triggers.ts";

export default deltaTrigger({
  key: "item-deleted",
  title: "Item Deleted",
  description:
    "The run gets the id (and name, when Graph still reports it) of a file or folder that was deleted from the drive, from Microsoft Graph delta.",
  change: "deleted",
  withFolder: false,
});
