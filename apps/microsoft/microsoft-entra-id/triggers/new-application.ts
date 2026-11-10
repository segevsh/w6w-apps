import listApplications from "../actions/list-applications.ts";
import { createdDescTrigger } from "../lib/triggers.ts";

// https://learn.microsoft.com/en-us/graph/api/application-list (verified 2026-11-10): `createdDateTime`
// supports `$orderby` on application, so page 1 of `createdDateTime desc` is the newest-first feed.
export default createdDescTrigger({
  key: "new-application",
  title: "New Application",
  description: "The run gets each newly registered application (app registration) in the tenant.",
  action: listApplications as never,
  select: ["id", "appId", "displayName", "signInAudience", "createdDateTime"],
  output: [
    { key: "id", type: "string", label: "Object ID" },
    { key: "appId", type: "string", label: "Application (client) ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "signInAudience", type: "string", label: "Sign-in audience" },
    { key: "createdDateTime", type: "string", label: "Created at" },
  ],
  sample: {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    appId: "a1b2c3d4-0000-4000-8000-000000000002",
    displayName: "Contoso Portal",
    signInAudience: "AzureADMyOrg",
    createdDateTime: "2026-11-10T09:00:00Z",
  },
});
