import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "campaign-list",
  resource: "campaign",
  title: "List Campaigns",
  description:
    "List campaigns: a campaign page created in Action Network's interface. The API only reads them.",
  path: () => "/campaigns",
  filterFields: "identifier, created_date, modified_date, origin_system, title",
});
