import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "level-get",
  resource: "level",
  title: "Get Level",
  description: "Retrieve one level by id.",
  path: "/levels",
  scope: "levels.read",
  expandable: ["parent", "track"],
});
