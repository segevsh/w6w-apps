import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "prospect-list",
  resource: "prospect",
  path: "/prospects",
  title: "List Prospects",
  description: "List prospects (sales opportunities).",
});
