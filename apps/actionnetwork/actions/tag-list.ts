import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "tag-list",
  resource: "tag",
  title: "List Tags",
  description:
    "List the group's tags, 25 per page. Tags exist only for group API keys; a personal key is refused.",
  path: () => "/tags",
});
