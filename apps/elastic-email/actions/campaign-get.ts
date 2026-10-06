import { getAction } from "../lib/factory.ts";

/** `GET /v4/campaigns/{name}` */
export default getAction({
  key: "campaign-get",
  title: "Get Campaign",
  description: "Load one campaign by name: status, content, recipients and options.",
  resource: "campaign",
  path: "/campaigns/{id}",
  idKey: "name",
  idLabel: "Campaign name",
  outputKey: "Name",
});
