import { boxTrigger } from "../lib/triggers.ts";

/** Box `SHARED_LINK.DELETED` on a watched folder. */
const sharedLinkDeleted = boxTrigger({
  key: "shared-link-deleted",
  title: "Shared Link Deleted",
  description:
    "Fires when a shared link on an item in a Box folder you choose is removed. The run gets the item's id, name, the person who did it and the time.",
  trigger: "SHARED_LINK.DELETED",
});

export default sharedLinkDeleted;
