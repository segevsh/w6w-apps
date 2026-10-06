import { type Input, listAction, optionalIdParam, scopedPath } from "../lib/factory.ts";

const PARENT = { key: "advocacyCampaignId", base: "/advocacy_campaigns" };

export default listAction({
  key: "outreach-list",
  resource: "outreach",
  title: "List Outreaches",
  description:
    "List outreaches: people who wrote or called a target. Scope by advocacy campaign or by person. Give exactly one of the two.",
  params: [
    optionalIdParam("advocacyCampaignId", "Advocacy campaign ID"),
    optionalIdParam("personId", "Person ID", "List this person's outreaches instead."),
  ],
  path: (i: Input) => scopedPath(i, PARENT, "outreaches"),
  filterFields: "identifier, created_date, modified_date",
});
