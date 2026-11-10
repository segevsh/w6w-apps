import type { ActionDefinition } from "@w6w/types";
import { cursorSnapshot } from "../lib/triggers.ts";
import vendorList from "../actions/vendor-list.ts";

/** `GET /v1/vendors` has no sort or since filter, so it is read through `nextCursor` and diffed by id (added rows only). */
export default cursorSnapshot({
  key: "new-vendor",
  title: "New Vendor",
  description: "The run gets each newly created vendor: id and name.",
  action: vendorList as ActionDefinition,
  listKey: "vendors",
  output: [
    { key: "id", type: "number", label: "Vendor ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 8, name: "Acme Parts" },
});
