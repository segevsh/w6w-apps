import { syncTrigger } from "../lib/triggers.ts";

const rejectAllowlistChanged = syncTrigger({
  key: "reject-allowlist-changed",
  title: "Reject Allowlist Changed",
  description:
    "Fires when an entry is added to or removed from the rejection allowlist (sync event whitelist). The run gets the list, the action, the email address, the reason and the full sync event.",
  list: "whitelist",
});

export default rejectAllowlistChanged;
