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
 * `GET /2.0/repositories/{workspace}?sort=-created_on` is newest-first: the shared `sort` query
 * parameter works on this resource, "prefix the field name with a hyphen to reverse the order",
 * and `pagelen` is capped at 100 (https://developer.atlassian.com/cloud/bitbucket/rest/intro/,
 * verified 2026-11-10).
 */
export default pollFromListAction<{ workspace?: string }>({
  key: "new-repository",
  title: "New Repository",
  description: "The run gets each repository newly created in the chosen Bitbucket workspace.",
  action: listRepositories as unknown as ActionDefinition,
  params: [WORKSPACE_ONLY_PARAM],
  input: (params) => ({ workspace: workspaceOf(params), sort: "-created_on", pagelen: 100 }),
  items: (result) => (result as { values?: unknown[] })?.values ?? [],
  idOf: (item) => String((item as { uuid?: unknown }).uuid ?? ""),
  output: REPOSITORY_OUTPUT,
  sample: REPOSITORY_SAMPLE,
  maxPages: 1,
});
