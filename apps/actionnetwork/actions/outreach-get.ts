import { getAction, idParam, optionalIdParam, scopedItemPath } from "../lib/factory.ts";
import { recordOutput } from "../lib/person.ts";

const PARENT = { key: "advocacyCampaignId", base: "/advocacy_campaigns" };

export default getAction({
  key: "outreach-get",
  resource: "outreach",
  title: "Get Outreach",
  description:
    "Fetch one outreach by id, under its advocacy campaign or under the person. Give exactly one of the two.",
  params: [
    idParam("outreachId", "Outreach ID"),
    optionalIdParam("advocacyCampaignId", "Advocacy campaign ID"),
    optionalIdParam("personId", "Person ID"),
  ],
  path: (i) => scopedItemPath(i, PARENT, "outreaches", "outreachId"),
  output: recordOutput(
    { key: "type", type: "string", label: "email or phone" },
    { key: "subject", type: "string", label: "Letter subject (email campaigns)" },
    { key: "message", type: "string", label: "Letter body (email campaigns)" },
    { key: "targets", type: "array", label: "Targets: { title, given_name, family_name, ocdid }" },
  ),
});
