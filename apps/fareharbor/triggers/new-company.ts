import companyList from "../actions/company-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-company",
  title: "New Company",
  description: "The run gets each company the API keys newly gain access to.",
  action: companyList,
  items: (result) => (result as { companies?: unknown[] })?.companies ?? [],
  idOf: (item) => String((item as { shortname?: unknown })?.shortname ?? ""),
  output: [
    { key: "shortname", type: "string", label: "Shortname" },
    { key: "name", type: "string", label: "Name" },
    { key: "currency", type: "string", label: "Currency" },
  ],
  sample: { shortname: "bodyglove", name: "Body Glove", currency: "usd" },
});
