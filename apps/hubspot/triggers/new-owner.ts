import { newSnapshotTrigger, OWNERS_ACTION } from "../lib/polls.ts";

/**
 * Owners are the portal's users, a small configuration collection (cursor-paged, 100 a page,
 * walked in full each check and capped at 2000), so the whole list is watched as a snapshot.
 */
export default newSnapshotTrigger({
  key: "new-owner",
  title: "New Owner",
  description:
    "Polls the HubSpot CRM owners and emits each owner added since the last check. The run gets the owner.",
  action: OWNERS_ACTION,
  sample: {
    change: "added",
    key: "1234",
    values: { id: "1234", email: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
  },
});
