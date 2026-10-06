import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "purchase-get",
  resource: "purchase",
  title: "Get Purchase",
  description: "Fetch one purchase by its numeric id.",
  path: "/purchases",
  idLabel: "Purchase ID",
  outputLabel: "Purchase",
});
