import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "query-list",
  resource: "query",
  title: "List Queries",
  description:
    "List queries: a saved targeting query. Read-only; ids go into Create Message targets.",
  path: () => "/queries",
});
