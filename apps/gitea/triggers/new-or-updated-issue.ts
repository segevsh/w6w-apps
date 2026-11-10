import { sinceTrigger } from "../lib/since.ts";
import {
  type Issue,
  issueOutput,
  issueSample,
  issueWindow,
  type RepoParams,
  timeMs,
} from "../lib/issues.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * Since-filter (brief 9.1 b, 9.2): the window is every issue updated since the last check
 * (`since`); an edit changes `updated_at`, so the id carries it and each update is one event.
 * Safeguards 9.8 and 9.9 live in `lib/since.ts`.
 */
export default sinceTrigger<Issue, RepoParams>({
  key: "new-or-updated-issue",
  title: "New or Updated Issue",
  description:
    "The run gets each issue in the chosen repository that is new or has been updated, once per update (not pull requests).",
  params: [REPO_PARAM, OWNER_PARAM],
  fetchWindow: (sinceMs, ctx, params) => issueWindow(sinceMs, ctx, params, "new-or-updated-issue"),
  idOf: (issue) => `${issue.id}:${issue.updated_at}`,
  timeOf: (issue) => timeMs(issue.updated_at),
  output: issueOutput,
  sample: issueSample,
});
