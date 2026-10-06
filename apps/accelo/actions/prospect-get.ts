import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "prospect-get",
  resource: "prospect",
  path: "/prospects",
  idKey: "prospectId",
  idLabel: "Prospect ID",
  title: "Get Prospect",
  description: "Fetch one prospect by id.",
});
