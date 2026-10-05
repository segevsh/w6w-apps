import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "job-profile-list",
  resource: "job-profile",
  title: "List job profiles",
  description:
    "Job profiles (`id`, `name`, `inactive`). Active only unless `includeInactive` is set. " +
    "Staffing service v7 `GET /jobProfiles`; secured by Job Profile: View / Public Job: View.",
  service: "staffing",
  path: "/jobProfiles",
  params: [{ key: "includeInactive", label: "Include inactive", type: "boolean" }],
  query: (i) => ({ includeInactive: i.includeInactive as boolean | undefined }),
});
