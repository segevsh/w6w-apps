import type { ActionDefinition } from "@w6w/types";
import action from "../actions/list-packages.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /consultant/packages`: "Returns a list of package definitions, ordered by rank." (https://api-docs.practicebetter.io/swagger.json, verified 2026-11-10), so no newest-first window exists; the catalogue is small, so each check diffs it whole. */
export default snapshotTrigger({
  key: "new-package",
  title: "New Package",
  description:
    "The run gets each package definition that appears in the practice, found by diffing the whole `list-packages` listing between checks.",
  action: action as unknown as ActionDefinition,
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Package ID",
    },
    {
      "key": "name",
      "type": "string",
      "label": "Package name",
    },
    {
      "key": "sku",
      "type": "string",
      "label": "SKU",
    },
  ],
  sample: {
    "id": "pkg-1",
    "name": "Six-week programme",
    "sku": "SIX-WEEK",
  },
});
