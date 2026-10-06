import { getAction } from "../lib/factory.ts";

/** `GET /v2/public/search/registrants/{id}?product=` */
export default getAction({
  key: "registrant-get",
  segment: "registrants",
  noun: "registrant",
  idKey: "registrantId",
  idLabel: "Registrant ID",
  expand: ["memberships", "subscriptions"],
});
