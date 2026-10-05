import { listAction } from "../lib/actions.ts";
import { list } from "../lib/client.ts";

export default listAction({
  key: "job-family-list",
  resource: "job-family",
  title: "List job families",
  description:
    "Job families with their job family group and job profiles. Active only unless `inactive` is set. " +
    "Staffing service v7 `GET /jobFamilies`; secured by Job Information.",
  service: "staffing",
  path: "/jobFamilies",
  params: [
    {
      key: "inactive",
      label: "Inactive only",
      type: "boolean",
      hint: "Return inactive job families.",
    },
    {
      key: "jobFamilyGroup",
      label: "Job family groups",
      type: "string",
      hint: "Workday IDs, comma separated. Each becomes its own `jobFamilyGroup` query parameter.",
    },
    {
      key: "jobProfile",
      label: "Job profiles",
      type: "string",
      hint: "Workday IDs, comma separated. Each becomes its own `jobProfile` query parameter.",
    },
  ],
  query: (i) => ({
    inactive: i.inactive as boolean | undefined,
    jobFamilyGroup: list(i.jobFamilyGroup),
    jobProfile: list(i.jobProfile),
  }),
});
