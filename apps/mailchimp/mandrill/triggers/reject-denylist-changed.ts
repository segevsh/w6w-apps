import { syncTrigger } from "../lib/triggers.ts";

const rejectDenylistChanged = syncTrigger({
  key: "reject-denylist-changed",
  title: "Reject Denylist Changed",
  description:
    "Fires when an entry is added to, changed in or removed from the rejection denylist (sync event blacklist). The run gets the list, the action, the email address, the reason and the full sync event.",
  list: "blacklist",
});

export default rejectDenylistChanged;
