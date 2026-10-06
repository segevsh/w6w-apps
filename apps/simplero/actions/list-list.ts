import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "list-list",
  resource: "list",
  title: "List Email Lists",
  description: "List the account's email lists (the lists contacts subscribe to).",
  path: "/lists",
  itemsLabel: "Email lists",
});
