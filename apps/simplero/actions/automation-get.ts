import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "automation-get",
  resource: "automation",
  title: "Get Automation",
  description: "Fetch one automation by its numeric id.",
  path: "/automations",
  idLabel: "Automation ID",
  outputLabel: "Automation",
});
