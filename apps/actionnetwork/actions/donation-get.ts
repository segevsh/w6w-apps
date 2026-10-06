import { getAction, idParam, optionalIdParam, scopedItemPath } from "../lib/factory.ts";
import { recordOutput } from "../lib/person.ts";

const PARENT = { key: "fundraisingPageId", base: "/fundraising_pages" };

export default getAction({
  key: "donation-get",
  resource: "donation",
  title: "Get Donation",
  description:
    "Fetch one donation by id, under its fundraising page or under the person. Give exactly one of the two (or neither, for the account-wide route).",
  params: [
    idParam("donationId", "Donation ID"),
    optionalIdParam("fundraisingPageId", "Fundraising page ID"),
    optionalIdParam("personId", "Person ID"),
  ],
  path: (i) => scopedItemPath(i, PARENT, "donations", "donationId", "/donations"),
  output: recordOutput(
    { key: "amount", type: "string", label: "Total amount" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "recipients", type: "array", label: "{ display_name, amount }" },
    { key: "action_network:recurrence", type: "object", label: "{ recurring, period }" },
  ),
});
