import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "team-get",
  resource: "team",
  title: "Get Team",
  description: "Retrieve one team by id.",
  path: "/teams",
  scope: "teams.read",
  expandable: ["parent"],
});
