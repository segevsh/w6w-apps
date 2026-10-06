import { getAction } from "../lib/factory.ts";

/** `GET /v2/public/search/memberships/{id}?product=` */
export default getAction({
  key: "membership-get",
  segment: "memberships",
  noun: "membership",
  idKey: "membershipId",
  idLabel: "Membership ID",
});
