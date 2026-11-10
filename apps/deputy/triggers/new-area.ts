import operationalUnitList from "../actions/operational-unit-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /resource/OperationalUnit` — Areas are few; one response (the server's 500-record cap)
 * holds them all, so each check diffs the ids. https://developer.deputy.com/docs */
export default snapshotTrigger({
  key: "new-area",
  title: "New Area",
  description: "The run gets each Area (Deputy `OperationalUnit`) newly created in the install.",
  action: operationalUnitList,
  input: () => ({}),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  keyOf: (item) => String((item as { Id?: unknown }).Id ?? ""),
  output: [
    { key: "Id", type: "number", label: "Area ID" },
    { key: "OperationalUnitName", type: "string", label: "Name" },
    { key: "Company", type: "number", label: "Location ID" },
  ],
  sample: { Id: 7, OperationalUnitName: "Kitchen", Company: 3 },
});
