import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "layout-list",
  resource: "layout",
  title: "List Layouts",
  description: "List invoice layouts; one is required on a draft invoice.",
  path: "/layouts",
});
