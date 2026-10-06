import { getAction } from "../lib/factory.ts";
export default getAction({
  key: "opportunity-get",
  title: "Get Opportunity",
  noun: "Opportunity",
  type: "opportunity",
  path: "opportunities",
  description: "Fetch one opportunity by ID.",
});
