import type { ActionDefinition } from "@w6w/types";
import { csv, query, VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/risk-scenarios` — the risk register.
 *
 * Every framework requires one, and it is the part of a compliance program that
 * is written by people rather than collected by integrations: "a supplier
 * suffers a breach", "a departing engineer retains access". Each scenario
 * carries an inherent score, a treatment decision and — once controls are
 * mapped to it — a residual score.
 *
 * ## Two things worth filtering for
 *
 * **Unowned scenarios.** A risk nobody owns is the register's version of an
 * unowned control, and `ownerMatchesAny` takes the literal string
 * `"No owner"` for exactly this — an unusual API decision, and a useful one.
 *
 * **Uncategorised ones**, via `"Uncategorized"` in `categoryMatchesAny`, which
 * is how a register that has been added to but never organised shows up.
 *
 * By default Vanta returns risk scenarios and **not** enterprise risks — the
 * `type` parameter is opt-in, and a register that looks short is often this.
 */
const action: ActionDefinition = {
  key: "risk-scenario-list",
  type: "read",
  resource: "risk",
  title: "List risk scenarios",
  description:
    "The risk register — the part written by people rather than collected by integrations. " +
    "Enterprise risks are excluded unless asked for, which is why a register can look short.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "Risk Scenario",
      options: [
        { value: "Risk Scenario", label: "Risk scenarios" },
        { value: "Enterprise Risk", label: "Enterprise risks" },
      ],
      hint: "Vanta returns only one type per call, and defaults to risk scenarios.",
    },
    {
      key: "owners",
      label: "Owners",
      type: "string",
      default: "",
      hint: 'Comma-separated. The literal "No owner" finds scenarios nobody is accountable for.',
    },
    {
      key: "categories",
      label: "Categories",
      type: "string",
      default: "",
      hint: 'The literal "Uncategorized" finds a register that was added to and never organised.',
    },
    { key: "search", label: "Search", type: "string", default: "", advanced: true },
    {
      key: "includeIgnored",
      label: "Include Ignored",
      type: "boolean",
      default: false,
      advanced: true,
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "scenarios", type: "array", label: "Risk scenarios" },
    { key: "count", type: "number", label: "Scenarios returned" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll(
      "/risk-scenarios",
      {
        query: query({
          type: p.type === undefined ? "Risk Scenario" : String(p.type),
          ownerMatchesAny: csv(p.owners),
          categoryMatchesAny: csv(p.categories),
          searchString: p.search,
          includeIgnored: p.includeIgnored === true ? true : undefined,
        }),
      },
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    return { scenarios: page.items, count: page.items.length, hasNextPage: page.hasNextPage };
  },
};

export default action;
