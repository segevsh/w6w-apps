import type { TriggerDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/snapshots.ts";
import action from "../actions/bump-list.ts";

/** Fires for an order-bump offer newly added to the account. */
const trigger: TriggerDefinition = snapshotTrigger({
  key: "new-bump",
  title: "New Bump Offer",
  description:
    "Fires when an order-bump offer is added to your ThriveCart account (the whole bump offers list is compared each check; the endpoint is not paginated). The run gets the new item.",
  action,
  idField: "bump_id",
  label: "Bump offers",
  sample: { bump_id: "2", name: "Example", typeString: "digital" },
});

export default trigger;
