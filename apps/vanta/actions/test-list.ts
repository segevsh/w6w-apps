import type { ActionDefinition } from "@w6w/types";
import { query, VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/tests` — what is passing, and what is not.
 *
 * The action most Vanta workflows are built on. A test is a continuously
 * evaluated assertion — "all production databases are encrypted", "every laptop
 * has disk encryption on" — and its status is the closest thing a compliance
 * program has to a build status.
 *
 * ## Read the status vocabulary before filtering on it
 *
 * Six values, and three of them are not failures:
 *
 *   - **`NEEDS_ATTENTION`** — the one that means "broken". This is what a
 *     morning digest wants.
 *   - **`IN_PROGRESS`** — Vanta is still evaluating; not a pass and not a
 *     failure.
 *   - **`DEACTIVATED`** — somebody switched it off. Worth listing separately,
 *     because a deactivated test is a decision that stops appearing in any
 *     failure report and quietly persists.
 *   - **`NOT_APPLICABLE`**, **`INVALID`**, **`OK`** — the rest.
 *
 * A dashboard that counts "not OK" as failing counts tests Vanta is still
 * computing and tests somebody deliberately excluded.
 *
 * ## `isInRollout` hides tests that are not real yet
 *
 * A test in rollout is upcoming and has no history. Including them inflates a
 * failure count with tests nobody has had a chance to pass, so this defaults to
 * excluding them and says so.
 */
const action: ActionDefinition = {
  key: "test-list",
  type: "read",
  resource: "test",
  title: "List tests",
  description:
    "Continuously-evaluated compliance assertions and their status. `NEEDS_ATTENTION` is the " +
    "one that means broken — `IN_PROGRESS` and `DEACTIVATED` are not failures.",
  params: [
    {
      key: "statusFilter",
      label: "Status",
      type: "select",
      default: "NEEDS_ATTENTION",
      options: [
        { value: "NEEDS_ATTENTION", label: "Needs attention — the failures" },
        { value: "OK", label: "Passing" },
        { value: "IN_PROGRESS", label: "Still evaluating" },
        { value: "DEACTIVATED", label: "Deactivated — switched off by somebody" },
        { value: "NOT_APPLICABLE", label: "Not applicable" },
        { value: "INVALID", label: "Invalid" },
        { value: "", label: "Any status" },
      ],
    },
    {
      key: "frameworkFilter",
      label: "Framework",
      type: "string",
      default: "",
      hint: "`framework-list` maps names to ids. A SOC 2 report and an ISO 27001 report are " +
        "different subsets of the same tests.",
    },
    { key: "controlFilter", label: "Control ID", type: "string", default: "" },
    {
      key: "integrationFilter",
      label: "Integration",
      type: "string",
      default: "",
      hint: "Narrow to the tests fed by one integration — useful when that integration is the " +
        "thing that broke.",
    },
    { key: "ownerFilter", label: "Owner (User ID)", type: "string", default: "", advanced: true },
    {
      key: "categoryFilter",
      label: "Category",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "COMPUTERS",
    },
    {
      key: "includeRollout",
      label: "Include Upcoming Tests",
      type: "boolean",
      default: false,
      hint: "Tests in rollout have no history yet. Including them inflates a failure count with " +
        "tests nobody has had a chance to pass.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "tests", type: "array", label: "Tests" },
    { key: "count", type: "number", label: "Tests returned" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    // The param's default applies here too: a bare call should mean "what is
    // broken", not "everything including what Vanta is still computing".
    const status = p.statusFilter === undefined ? "NEEDS_ATTENTION" : String(p.statusFilter);

    const page = await client.pageAll(
      "/tests",
      {
        query: query({
          statusFilter: status,
          frameworkFilter: p.frameworkFilter,
          controlFilter: p.controlFilter,
          integrationFilter: p.integrationFilter,
          ownerFilter: p.ownerFilter,
          categoryFilter: p.categoryFilter,
          isInRollout: p.includeRollout === true ? undefined : false,
        }),
      },
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    ctx.log("info", "read Vanta tests", { count: page.items.length, status });
    return { tests: page.items, count: page.items.length, hasNextPage: page.hasNextPage };
  },
};

export default action;
