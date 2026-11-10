import { boxTrigger } from "../lib/triggers.ts";

/** Box `SHARED_LINK.CREATED` on a watched folder. */
const sharedLinkCreated = boxTrigger({
  key: "shared-link-created",
  title: "Shared Link Created",
  description:
    "Fires when a shared link is created on an item in a Box folder you choose. The run gets the item's id, name, the person who did it and the time.",
  trigger: "SHARED_LINK.CREATED",
});

export default sharedLinkCreated;
