import type { TriggerDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/snapshots.ts";
import action from "../actions/upsell-list.ts";

/** Fires for an upsell newly added to the account. */
const trigger: TriggerDefinition = snapshotTrigger({
  key: "new-upsell",
  title: "New Upsell",
  description:
    "Fires when an upsell is added to your ThriveCart account (the whole upsells list is compared each check; the endpoint is not paginated). The run gets the new item.",
  action,
  idField: "upsell_id",
  label: "Upsells",
  sample: { upsell_id: "2", name: "Example", typeString: "digital" },
});

export default trigger;
