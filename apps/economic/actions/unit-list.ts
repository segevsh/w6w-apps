import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "unit-list",
  resource: "unit",
  title: "List Units",
  description: "List product units (pieces, hours, ...).",
  path: "/units",
});
