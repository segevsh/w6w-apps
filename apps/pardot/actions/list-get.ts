import { getAction } from "../lib/query.ts";

export default getAction({
  key: "list-get",
  title: "Get List",
  description: "Read one list by id.",
  path: "lists",
  resource: "list",
  idLabel: "List ID",
  defaultFields:
    "id,name,title,description,isPublic,isDynamic,campaignId,folderId,createdAt,updatedAt",
});
