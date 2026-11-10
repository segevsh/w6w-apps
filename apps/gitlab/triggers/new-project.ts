import { pollFromListAction } from "../../_shared/poll/mod.ts";
import projectGetMany from "../actions/project-get-many.ts";

/**
 * A new project the connected account belongs to. GitLab's project webhooks cannot announce a
 * project being created (that event exists only for group and system hooks), so this polls the
 * list the `project-get-many` action reads. `GET /projects` returns the newest first
 * (`order_by` defaults to `created_at`, `sort` to `desc`:
 * https://docs.gitlab.com/api/projects/#list-all-projects, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-project",
  title: "New Project",
  description:
    "The run gets each project the connected account has just become a member of or created.",
  action: projectGetMany,
  input: () => ({ membership: true, perPage: 100 }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "path_with_namespace", type: "string", label: "Full path" },
    { key: "web_url", type: "string", label: "URL" },
  ],
  sample: {
    id: 278964,
    path_with_namespace: "gitlab-org/gitlab-test",
    web_url: "https://gitlab.com/gitlab-org/gitlab-test",
  },
  maxPages: 1,
});
