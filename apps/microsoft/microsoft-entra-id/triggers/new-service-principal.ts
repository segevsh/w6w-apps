import listServicePrincipals from "../actions/list-service-principals.ts";
import { createdDescTrigger } from "../lib/triggers.ts";

// https://learn.microsoft.com/en-us/graph/aad-advanced-queries lists `servicePrincipal.createdDateTime`
// among the directory properties that support `$orderby` (with the advanced-query header), so page
// 1 of `createdDateTime desc` is the newest-first feed. The page maximum for this collection is 100
// (https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list).
export default createdDescTrigger({
  key: "new-service-principal",
  title: "New Service Principal",
  description:
    "The run gets each newly created service principal (enterprise application) in the tenant.",
  action: listServicePrincipals as never,
  select: ["id", "appId", "displayName", "servicePrincipalType", "createdDateTime"],
  output: [
    { key: "id", type: "string", label: "Object ID" },
    { key: "appId", type: "string", label: "Application (client) ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "servicePrincipalType", type: "string", label: "Type" },
    { key: "createdDateTime", type: "string", label: "Created at" },
  ],
  sample: {
    id: "a1b2c3d4-0000-4000-8000-000000000003",
    appId: "a1b2c3d4-0000-4000-8000-000000000002",
    displayName: "Contoso Portal",
    servicePrincipalType: "Application",
    createdDateTime: "2026-11-10T09:00:00Z",
  },
});
