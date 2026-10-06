import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "list-list",
  resource: "list",
  title: "List Lists",
  description: "List lists: a list: the report or email audience behind a mass email. Read-only.",
  path: () => "/lists",
});
