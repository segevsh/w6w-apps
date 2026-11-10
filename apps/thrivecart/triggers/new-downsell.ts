import type { TriggerDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/snapshots.ts";
import action from "../actions/downsell-list.ts";

/** Fires for a downsell newly added to the account. */
const trigger: TriggerDefinition = snapshotTrigger({
  key: "new-downsell",
  title: "New Downsell",
  description:
    "Fires when a downsell is added to your ThriveCart account (the whole downsells list is compared each check; the endpoint is not paginated). The run gets the new item.",
  action,
  idField: "downsell_id",
  label: "Downsells",
  sample: { downsell_id: "2", name: "Example", typeString: "digital" },
});

export default trigger;
