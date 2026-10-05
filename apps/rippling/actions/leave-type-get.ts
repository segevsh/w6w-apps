import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "leave-type-get",
  resource: "leave-type",
  title: "Get Leave Type",
  description: "Retrieve one leave type by id.",
  path: "/leave-types",
  scope: "leave-types.read",
  expandable: [],
});
