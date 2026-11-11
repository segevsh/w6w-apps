import { snapshotTrigger } from "../lib/triggers.ts";
import siteList from "../actions/site-list.ts";

interface Rec {
  id?: number | string;
}

/** Sites are read whole (`GET /sites`, pages of 100, no sort or created filter documented); ids are diffed between checks. */
const newSite = snapshotTrigger({
  key: "new-site",
  title: "New Site",
  description:
    "The run gets each site that appears in the company site list (Get Many Sites; Project Management View only).",
  action: siteList,
  paged: true,
  idOf: (x) => String((x as Rec).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Site ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "string", label: "Address" },
    { key: "city", type: "string", label: "City" },
    { key: "state", type: "string", label: "State" },
    { key: "zip_code", type: "string", label: "ZIP code" },
    { key: "country", type: "string", label: "Country" },
    { key: "code", type: "string", label: "Code" },
  ],
  sample: {
    id: 7,
    type: "site",
    name: "Site #1",
    address: "1234 Elm Street",
    city: "Springfield",
    state: "IL",
    zip_code: "62704",
    country: "US",
    code: "A1B2C3",
  },
});

export default newSite;
