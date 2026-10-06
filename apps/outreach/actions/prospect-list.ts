import { listAction } from "../lib/factory.ts";
export default listAction({
  key: "prospect-list",
  title: "List Prospects",
  noun: "Prospect",
  type: "prospect",
  path: "prospects",
  search: true,
  description:
    "List prospects with Outreach filters, sorting and cursor pagination. Since 1 Oct 2026 the `contactHistogram` attribute is no longer in the default payload; request it with Fields.",
});
