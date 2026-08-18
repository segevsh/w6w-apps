import type { ActionDefinition } from "@w6w/types";
import { compact, csv, emptyToUndefined, NewRelicClient } from "../lib/client.ts";
import { ACCOUNT_PARAM } from "../lib/params.ts";

/**
 * `aiIssues { issues }` — what is currently wrong.
 *
 * ## Three nouns that are not the same thing
 *
 * New Relic's alerting has a hierarchy, and mixing the levels up is the usual
 * source of confusion:
 *
 * - An **incident** is one condition breaching its threshold once.
 * - An **issue** groups related incidents — this is what a person is paged
 *   about, and what gets acknowledged and closed.
 * - An **anomaly** is a detected deviation, which may or may not become either.
 *
 * This queries issues, because that is the level a workflow wants: one entry
 * per thing gone wrong, rather than one per breach.
 *
 * ## The state machine has three values and the middle one matters
 *
 * `CREATED` — open, nobody has looked. `ACTIVATED` — open and acknowledged.
 * `CLOSED` — resolved. Filtering to "open" means both of the first two, and a
 * filter that asks only for `CREATED` silently omits everything somebody is
 * already working on.
 */
const action: ActionDefinition = {
  key: "issue-list",
  type: "read",
  resource: "issue",
  title: "List issues",
  description:
    "What is currently wrong. An ISSUE groups incidents and is what a person is paged about — " +
    "filtering to CREATED alone omits everything already being worked on.",
  params: [
    ACCOUNT_PARAM,
    {
      key: "states",
      label: "States",
      type: "string",
      default: "CREATED,ACTIVATED",
      hint: "Comma-separated: CREATED, ACTIVATED, CLOSED. The default is everything still open.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "CRITICAL", label: "Critical" },
        { value: "HIGH", label: "High" },
        { value: "MEDIUM", label: "Medium" },
        { value: "LOW", label: "Low" },
      ],
    },
    { key: "cursor", label: "Cursor", type: "string", default: "" },
  ],
  output: [
    { key: "issues", type: "array", label: "Issues" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "unacknowledged", type: "number", label: "Open and not yet acknowledged" },
    { key: "criticalCount", type: "number", label: "Critical issues in this page" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new NewRelicClient(ctx);
    const account = client.account(p.accountId);
    const states = csv(p.states)?.map((s) => s.toUpperCase());
    const priority = String(p.priority ?? "").trim().toUpperCase();

    const data = await client.gql<{
      actor?: {
        account?: {
          aiIssues?: {
            issues?: {
              issues?: Array<{ issueId?: string; state?: string; priority?: string }>;
              nextCursor?: string | null;
            };
          };
        };
      };
    }>(
      `query($accountId: Int!, $cursor: String, $filter: AiIssuesFilters) {
        actor {
          account(id: $accountId) {
            aiIssues {
              issues(cursor: $cursor, filter: $filter) {
                issues {
                  issueId title priority state
                  createdAt activatedAt closedAt
                  entityGuids entityNames
                  acknowledgedBy acknowledgedAt
                  totalIncidents
                }
                nextCursor
              }
            }
          }
        }
      }`,
      compact({
        accountId: account,
        cursor: p.cursor,
        filter: emptyToUndefined(compact({ states, priority: priority || undefined })),
      }),
    );

    const page = data?.actor?.account?.aiIssues?.issues;
    const issues = page?.issues ?? [];

    ctx.log("info", "listed New Relic issues", { accountId: account, count: issues.length });

    return {
      issues,
      count: issues.length,
      // CREATED is open-and-untouched; ACTIVATED means somebody acknowledged it.
      unacknowledged: issues.filter((issue) => issue?.state === "CREATED").length,
      criticalCount: issues.filter((issue) => issue?.priority === "CRITICAL").length,
      cursor: page?.nextCursor ?? undefined,
    };
  },
};

export default action;
