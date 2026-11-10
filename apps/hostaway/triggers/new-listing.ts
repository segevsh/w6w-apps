import { snapshotTrigger } from "../lib/triggers.ts";
import listListings from "../actions/list-listings.ts";

export default snapshotTrigger({
  key: "new-listing",
  title: "New Listing",
  description: "The run gets each listing newly added to the Hostaway account.",
  action: listListings,
  input: (_p, w) => w,
  output: [
    { key: "id", type: "number", label: "Listing ID" },
    { key: "name", type: "string", label: "Listing name" },
    { key: "city", type: "string", label: "City" },
    { key: "country", type: "string", label: "Country" },
  ],
  sample: { id: 1001, name: "Harbour View Loft", city: "Lisbon", country: "Portugal" },
});
