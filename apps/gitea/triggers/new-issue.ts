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
 * Since-filter (brief 9.1 b): the window is every issue updated since the last check
 * (`since`), filtered to those created after the trigger was enabled. Safeguards 9.8 and 9.9 live
 * in `lib/since.ts`.
 */
export default sinceTrigger<Issue, RepoParams>({
  key: "new-issue",
  title: "New Issue",
  description: "The run gets each issue newly opened in the chosen repository (not pull requests).",
  params: [REPO_PARAM, OWNER_PARAM],
  fetchWindow: (sinceMs, ctx, params) => issueWindow(sinceMs, ctx, params, "new-issue"),
  idOf: (issue) => String(issue.id),
  timeOf: (issue) => timeMs(issue.created_at),
  output: issueOutput,
  sample: issueSample,
});
