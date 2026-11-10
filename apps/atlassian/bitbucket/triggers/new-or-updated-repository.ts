import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listRepositories from "../actions/list-repositories.ts";
import {
  REPOSITORY_OUTPUT,
  REPOSITORY_SAMPLE,
  WORKSPACE_ONLY_PARAM,
  workspaceOf,
} from "../lib/repositories.ts";

/**
 * `GET /2.0/repositories/{workspace}?sort=-updated_on` lists the most recently updated repository
 * first (shared `sort`, hyphen = descending; https://developer.atlassian.com/cloud/bitbucket/rest/intro/,
 * verified 2026-11-10). A repository's `updated_on` moves on a push or a settings change, so each
 * such change is a new event (`uuid:updated_on`).
 */
export default pollFromListAction<{ workspace?: string }>({
  key: "new-or-updated-repository",
  title: "New or Updated Repository",
  description:
    "The run gets each repository in the chosen Bitbucket workspace that is created or updated (a push or a settings change moves its updated time).",
  action: listRepositories as unknown as ActionDefinition,
  params: [WORKSPACE_ONLY_PARAM],
  input: (params) => ({ workspace: workspaceOf(params), sort: "-updated_on", pagelen: 100 }),
  items: (result) => (result as { values?: unknown[] })?.values ?? [],
  idOf: (item) => {
    const r = item as { uuid?: unknown; updated_on?: unknown };
    return `${String(r.uuid ?? "")}:${String(r.updated_on ?? "")}`;
  },
  output: REPOSITORY_OUTPUT,
  sample: REPOSITORY_SAMPLE,
  maxPages: 1,
});
