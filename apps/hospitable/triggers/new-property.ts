import { boundedList } from "../lib/triggers.ts";
import propertyList from "../actions/property-list.ts";

export default boundedList({
  key: "new-property",
  title: "New Property",
  description: "The run gets each property newly added to the Hospitable account.",
  action: propertyList as never,
  paged: true,
  output: [
    { key: "id", type: "string", label: "Property UUID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "object", label: "Address" },
  ],
  sample: { id: "property-1", name: "Harbour View Loft", address: { city: "Lisbon" } },
});
