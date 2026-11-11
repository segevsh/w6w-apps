import { snapshotTrigger } from "../lib/snapshot.ts";
import action from "../actions/department-list.ts";
import { dataOf, idOf, ORG_PARAM } from "../lib/triggers.ts";

/**
 * `GET /departments` (https://desk.zoho.com/DeskAPIDocument#Departments, 2026-11-10): an
 * organization's departments are a short list with no documented creation order, so each check
 * reads the first 100 and diffs the department ids against the previous one.
 */
export default snapshotTrigger({
  key: "new-department",
  title: "New Department",
  description: "The run gets each department newly created in the Zoho Desk organization.",
  action: action as never,
  params: [ORG_PARAM],
  input: (p) => ({ orgId: p.orgId, from: 1, limit: 100 }),
  items: dataOf,
  idOf,
  output: [
    { key: "id", type: "string", label: "Department ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "isEnabled", type: "boolean", label: "Enabled" },
    { key: "createdTime", type: "string", label: "Created time" },
  ],
  sample: {
    id: "1892000000006907",
    name: "Support",
    isEnabled: true,
    createdTime: "2026-11-09T12:00:00.000Z",
  },
});
