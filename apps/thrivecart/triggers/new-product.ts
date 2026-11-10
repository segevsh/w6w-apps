import type { TriggerDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/snapshots.ts";
import action from "../actions/product-list.ts";

/** Fires for a product newly added to the account. */
const trigger: TriggerDefinition = snapshotTrigger({
  key: "new-product",
  title: "New Product",
  description:
    "Fires when a product is added to your ThriveCart account (the whole products list is compared each check; the endpoint is not paginated). The run gets the new item.",
  action,
  idField: "product_id",
  label: "Products",
  sample: { product_id: "2", name: "Example", typeString: "digital" },
});

export default trigger;
