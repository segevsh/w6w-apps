import { type Input, listAction, optionalIdParam, scopedPath } from "../lib/factory.ts";

const PARENT = { key: "fundraisingPageId", base: "/fundraising_pages" };

export default listAction({
  key: "donation-list",
  resource: "donation",
  title: "List Donations",
  description:
    "List donations: people who donated. Scope by fundraising page or by person. With neither id it lists every one on the account.",
  params: [
    optionalIdParam("fundraisingPageId", "Fundraising page ID"),
    optionalIdParam("personId", "Person ID", "List this person's donations instead."),
  ],
  path: (i: Input) => scopedPath(i, PARENT, "donations", "/donations"),
  filterFields: "identifier, created_date, modified_date",
});
