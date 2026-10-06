import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "tag-list",
  resource: "tag",
  title: "List Tags",
  description: "List the account's tags, with how many contacts carry each.",
  path: "/tags",
  itemsLabel: "Tags",
});
