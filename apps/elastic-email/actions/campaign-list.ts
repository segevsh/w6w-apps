import { listAction, pagingParams } from "../lib/factory.ts";

/** `GET /v4/campaigns` — the vendor caps the result at 1000. */
export default listAction({
  key: "campaign-list",
  title: "List Campaigns",
  description: "List campaigns, optionally filtered by a name fragment. Limited to 1000 results.",
  resource: "campaign",
  path: "/campaigns",
  query: { search: "search" },
  params: [
    {
      key: "search",
      label: "Name contains",
      type: "string",
      hint: "Text fragment matched against the campaign name.",
    },
    ...pagingParams,
  ],
});
