import locationList from "../actions/location-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /resource/Company` — Locations are few; one response (the server's 500-record cap) holds
 * them all, so each check diffs the ids. https://developer.deputy.com/docs */
export default snapshotTrigger({
  key: "new-location",
  title: "New Location",
  description: "The run gets each Location (Deputy `Company`) newly created in the install.",
  action: locationList,
  input: () => ({}),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  keyOf: (item) => String((item as { Id?: unknown }).Id ?? ""),
  output: [
    { key: "Id", type: "number", label: "Location ID" },
    { key: "CompanyName", type: "string", label: "Name" },
    { key: "Code", type: "string", label: "Short code" },
  ],
  sample: { Id: 3, CompanyName: "Harbour Cafe", Code: "HC" },
});
