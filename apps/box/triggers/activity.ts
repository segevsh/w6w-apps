import { boxTrigger } from "../lib/triggers.ts";

/** Any chosen set of Box webhook triggers on one file or folder. */
const activity = boxTrigger({
  key: "activity",
  title: "Item Activity",
  description:
    "Fires on any Box webhook triggers you choose for a file or folder (uploads, deletes, comments, shares and more). The run gets the trigger name and the item it concerns.",
});

export default activity;
