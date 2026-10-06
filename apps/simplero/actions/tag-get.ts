import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "tag-get",
  resource: "tag",
  title: "Get Tag",
  description: "Fetch one tag by its numeric id.",
  path: "/tags",
  idLabel: "Tag ID",
  outputLabel: "Tag",
});
