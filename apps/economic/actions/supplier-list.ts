import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "supplier-list",
  resource: "supplier",
  title: "List Suppliers",
  description: "List suppliers.",
  path: "/suppliers",
});
