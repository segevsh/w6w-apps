import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "compensation-get",
  resource: "compensation",
  title: "Get Compensation",
  description: "Retrieve one compensation by id.",
  path: "/compensations",
  scope: "compensations.read",
  expandable: ["worker"],
});
