import type { ActionDefinition } from "@w6w/types";
import { csv, isoTimestamp, query, VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/issues` — the work queue.
 *
 * An issue is Vanta's unit of "somebody has to do something": a failing test
 * that has been triaged, a vulnerability past its SLA, an audit finding. It is
 * the object worth syncing into a ticketing system, because unlike a test
 * status it has an owner, a due date and a lifecycle.
 *
 * ## The date filters are the ones to reach for
 *
 * "What is overdue" is `dueBeforeDate` set to now. "What is about to be
 * overdue" is `dueBeforeDate` set to next week — and that is the query worth
 * running on a schedule, because it produces a list somebody can still act on.
 *
 * `includeOnlyIssuesWithoutDueDate` finds the other failure: issues nobody
 * scheduled, which never appear in an overdue report and never get done.
 *
 * `orderBy` with `severity` or `dueDate` decides what lands at the top of the
 * digest, which in practice decides what gets fixed.
 */
const action: ActionDefinition = {
  key: "issue-list",
  type: "read",
  resource: "issue",
  title: "List issues",
  description:
    "Vanta's work queue — items with an owner, a due date and a lifecycle. Filtering to a due " +
    "date next week produces a list somebody can still act on.",
  params: [
    {
      key: "statuses",
      label: "Statuses",
      type: "string",
      default: "",
      hint: "Comma-separated.",
    },
    { key: "severities", label: "Severities", type: "string", default: "" },
    {
      key: "dueBeforeDate",
      label: "Due Before",
      type: "datetime",
      default: "",
      hint: "Set to now for what is overdue, or to next week for what is about to be.",
    },
    { key: "dueAfterDate", label: "Due After", type: "datetime", default: "", advanced: true },
    {
      key: "onlyWithoutDueDate",
      label: "Only Issues With No Due Date",
      type: "boolean",
      default: false,
      hint: "The issues nobody scheduled, which never appear in an overdue report and never get " +
        "done.",
    },
    { key: "owners", label: "Owner User IDs", type: "string", default: "", advanced: true },
    { key: "controls", label: "Control IDs", type: "string", default: "", advanced: true },
    { key: "search", label: "Search", type: "string", default: "", advanced: true },
    {
      key: "orderBy",
      label: "Order By",
      type: "select",
      default: "dueDate",
      options: [
        { value: "dueDate", label: "Due date" },
        { value: "severity", label: "Severity" },
        { value: "createdDate", label: "Created" },
        { value: "detectedDate", label: "Detected" },
        { value: "lastModifiedDate", label: "Last modified" },
        { value: "status", label: "Status" },
      ],
    },
    {
      key: "orderDirection",
      label: "Direction",
      type: "select",
      default: "asc",
      options: [
        { value: "asc", label: "Ascending — soonest due first" },
        { value: "desc", label: "Descending" },
      ],
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "issues", type: "array", label: "Issues" },
    { key: "count", type: "number", label: "Issues returned" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const onlyWithout = p.onlyWithoutDueDate === true;

    const page = await client.pageAll(
      "/issues",
      {
        query: query({
          statusMatchesAny: csv(p.statuses),
          severityMatchesAny: csv(p.severities),
          ownerIdMatchesAny: csv(p.owners),
          controlIdMatchesAny: csv(p.controls),
          search: p.search,
          // Vanta rejects the pair; a caller asking for undated issues cannot
          // also be filtering on a due date.
          dueBeforeDate: onlyWithout ? undefined : isoTimestamp(p.dueBeforeDate, "dueBeforeDate"),
          dueAfterDate: onlyWithout ? undefined : isoTimestamp(p.dueAfterDate, "dueAfterDate"),
          includeOnlyIssuesWithoutDueDate: onlyWithout ? true : undefined,
          orderBy: p.orderBy === undefined ? "dueDate" : String(p.orderBy),
          orderDirection: p.orderDirection === undefined ? "asc" : String(p.orderDirection),
        }),
      },
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    ctx.log("info", "read Vanta issues", { count: page.items.length });
    return { issues: page.items, count: page.items.length, hasNextPage: page.hasNextPage };
  },
};

export default action;
