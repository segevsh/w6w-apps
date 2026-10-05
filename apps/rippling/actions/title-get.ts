import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "title-get",
  resource: "title",
  title: "Get Title",
  description: "Retrieve one title by id.",
  path: "/titles",
  scope: "titles.read",
  expandable: [],
});
