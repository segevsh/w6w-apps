import { getAction } from "../lib/query.ts";

export default getAction({
  key: "prospect-get",
  title: "Get Prospect",
  description:
    "Read one prospect by id. Unlike the list query, a read returns every custom field (`…__c`) you ask for.",
  path: "prospects",
  resource: "prospect",
  idLabel: "Prospect ID",
  defaultFields:
    "id,email,firstName,lastName,company,jobTitle,score,grade,campaignId,createdAt,updatedAt",
});
