import { boxTrigger } from "../lib/triggers.ts";

/** Box `SHARED_LINK.UPDATED` on a watched folder. */
const sharedLinkUpdated = boxTrigger({
  key: "shared-link-updated",
  title: "Shared Link Updated",
  description:
    "Fires when a shared link on an item in a Box folder you choose is changed. The run gets the item's id, name, the person who did it and the time.",
  trigger: "SHARED_LINK.UPDATED",
});

export default sharedLinkUpdated;
