import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "employment-type-get",
  resource: "employment-type",
  title: "Get Employment Type",
  description: "Retrieve one employment type by id.",
  path: "/employment-types",
  scope: "employment-types.read",
  expandable: [],
});
