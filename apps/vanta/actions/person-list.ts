import type { ActionDefinition } from "@w6w/types";
import { csv, query, VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/people` — everybody the compliance program covers.
 *
 * ## A person is not a user
 *
 * The distinction runs through this whole app and is worth stating once,
 * clearly. A **person** is somebody in the organisation whose compliance
 * obligations Vanta tracks — security training, policy acceptance, background
 * check, a monitored laptop — whether or not they have ever opened Vanta. A
 * **user** is somebody with a Vanta login.
 *
 * Ownership fields take **user** ids. Passing a person id from this list to
 * `control-set-owner` will not work.
 *
 * ## The task filters are the reason to automate this
 *
 * `tasksSummaryStatusMatchesAny` finds people with something outstanding, and
 * `taskTypeMatchesAny` narrows it to the kind — training, policy acceptance,
 * background check, device monitoring. That is the nudge workflow every
 * compliance team wants and nobody wants to run by hand.
 *
 * **The two task filters require each other.** Vanta's schema says
 * `taskTypeMatchesAny` "requires `taskStatusMatchesAny`" and the reverse, so
 * sending one alone silently does nothing — this action refuses instead.
 *
 * `employmentStatus` matters more than it looks: `FORMER` people still appear,
 * and an offboarding report that forgets to filter counts everybody who ever
 * worked there.
 */
const action: ActionDefinition = {
  key: "person-list",
  type: "read",
  resource: "person",
  title: "List people",
  description:
    "Everybody the compliance program covers — NOT the same as Vanta users. Filter by task " +
    "status to find outstanding training, policy acceptances and background checks.",
  params: [
    {
      key: "employmentStatus",
      label: "Employment Status",
      type: "select",
      default: "CURRENT",
      options: [
        { value: "CURRENT", label: "Current" },
        { value: "UPCOMING", label: "Upcoming" },
        { value: "ON_LEAVE", label: "On leave" },
        { value: "INACTIVE", label: "Inactive" },
        { value: "FORMER", label: "Former" },
        { value: "", label: "Any — including everybody who ever worked here" },
      ],
    },
    {
      key: "taskStatuses",
      label: "Task Statuses",
      type: "string",
      default: "",
      hint: "Comma-separated, e.g. `OVERDUE`. Requires Task Types to be set as well — Vanta " +
        "ignores either one on its own.",
    },
    {
      key: "taskTypes",
      label: "Task Types",
      type: "string",
      default: "",
      hint: "Comma-separated, e.g. `SECURITY_TRAINING,POLICY_ACCEPTANCE`. Requires Task Statuses.",
    },
    {
      key: "tasksSummaryStatuses",
      label: "Overall Task Status",
      type: "string",
      default: "",
      hint: "Filters on a person's rolled-up task state, and works on its own.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      default: "",
      hint: "Partial, case-insensitive match on email or name.",
    },
    { key: "groups", label: "Group IDs", type: "string", default: "", advanced: true },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "people", type: "array", label: "People" },
    { key: "count", type: "number", label: "People returned" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const taskStatuses = csv(p.taskStatuses);
    const taskTypes = csv(p.taskTypes);
    // Vanta requires the pair. One alone is silently ignored, which produces a
    // report that looks filtered and is not.
    if ((taskStatuses && !taskTypes) || (taskTypes && !taskStatuses)) {
      throw new Error(
        "`taskStatuses` and `taskTypes` must be given together — Vanta ignores either one on its " +
          "own, which produces a report that looks filtered and is not",
      );
    }

    const page = await client.pageAll(
      "/people",
      {
        query: query({
          employmentStatus: p.employmentStatus === undefined
            ? "CURRENT"
            : String(p.employmentStatus),
          taskStatusMatchesAny: taskStatuses,
          taskTypeMatchesAny: taskTypes,
          tasksSummaryStatusMatchesAny: csv(p.tasksSummaryStatuses),
          emailAndNameFilter: p.search,
          groupIdsMatchesAny: csv(p.groups),
        }),
      },
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    // A count, never the roster.
    ctx.log("info", "read Vanta people", { count: page.items.length });
    return { people: page.items, count: page.items.length, hasNextPage: page.hasNextPage };
  },
};

export default action;
