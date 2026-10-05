import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "worker-list",
  resource: "worker",
  title: "List workers",
  description:
    "Workers and their current staffing information (primary job, additional jobs, person). " +
    "Non-terminated workers only unless `includeTerminated` is set. Staffing service v7 `GET /workers`; " +
    "needs the Staffing scope and a domain security policy such as Worker Data: Public Worker Reports.",
  service: "staffing",
  path: "/workers",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Case-insensitive match on name or worker ID. Space-delimited terms are allowed.",
    },
    { key: "email", label: "Email", type: "string", hint: "Only workers whose email matches." },
    { key: "includeTerminated", label: "Include terminated", type: "boolean" },
    {
      key: "filterByOrgVisibility",
      label: "Filter by org visibility",
      type: "boolean",
      hint: "Only workers whose supervisory organizations the integration user can see.",
    },
  ],
  query: (i) => ({
    search: i.search as string,
    email: i.email as string,
    includeTerminatedWorkers: i.includeTerminated as boolean | undefined,
    filterByOrgVisibility: i.filterByOrgVisibility as boolean | undefined,
  }),
});
