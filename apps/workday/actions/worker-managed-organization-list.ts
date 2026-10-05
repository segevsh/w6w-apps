import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "worker-managed-organization-list",
  resource: "worker",
  title: "List supervisory organizations a worker manages",
  description: "The supervisory organizations the worker is the manager of. " +
    "Common service v1 `GET /workers/{ID}/supervisoryOrganizationsManaged`; secured by Reports: Organization.",
  service: "common",
  path: "/workers/{ID}/supervisoryOrganizationsManaged",
  idKey: "workerId",
  idLabel: "Worker ID",
});
