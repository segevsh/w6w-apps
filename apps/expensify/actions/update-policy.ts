import type { ActionDefinition } from "@w6w/types";
import { objectList, runJob, strArray } from "../lib/client.ts";

interface Input {
  policyID?: string;
  policyIDList?: string[] | string;
  categories?: unknown;
  categoriesAction?: "merge" | "replace";
  tags?: unknown;
  reportFields?: unknown;
  reportFieldsAction?: "merge" | "replace";
}

const ACTIONS = [
  { value: "merge", label: "Merge (keep existing, add/update the given)" },
  { value: "replace", label: "Replace (remove existing first)" },
];

const present = (v: unknown) => v !== undefined && v !== null && v !== "";

/** `update` / `policy` — the Policy updater (inline JSON only; the CSV tag-file mode is not exposed). */
const updatePolicy: ActionDefinition<Input> = {
  key: "update-policy",
  type: "perform",
  resource: "policy",
  title: "Update Policy",
  description:
    "Manage a policy's categories, tags and report fields from JSON. Updates one policy, or the same change across several policies. Needs admin rights on the policy.",
  idempotent: true,
  params: [
    { key: "policyID", label: "Policy ID", type: "string", hint: "Or use Policy IDs for several." },
    {
      key: "policyIDList",
      label: "Policy IDs",
      type: "array",
      item: { type: "string" },
      hint: "Apply the same update to all of these policies instead of a single policy ID.",
    },
    {
      key: "categories",
      label: "Categories",
      type: "json",
      hint:
        'JSON array of {"name","enabled", optional glCode, payrollCode, areCommentsRequired, commentHint, maxExpenseAmount (cents)}.',
    },
    {
      key: "categoriesAction",
      label: "Categories mode",
      type: "select",
      options: ACTIONS,
      default: "merge",
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      hint:
        'JSON array, one object per tag LEVEL: [{"name":"Tag","setRequired":true,"tags":[{"name":"Tag 1","glCode":"…","enabled":true}]}]. Independent levels only; replaces the policy\'s existing tags. Dependent multi-level tags need a CSV upload, which this action does not expose.',
    },
    {
      key: "reportFields",
      label: "Report fields",
      type: "json",
      hint:
        'JSON array of {"name","type":"text"|"dropdown"|"date","values":[strings or {name,externalID,enabled}] (dropdown only),"defaultValue"}.',
    },
    {
      key: "reportFieldsAction",
      label: "Report fields mode",
      type: "select",
      options: ACTIONS,
      default: "merge",
    },
  ],
  output: [{ key: "response", type: "object", label: "The Integration Server's response" }],

  async execute(input, ctx) {
    const ids = strArray(input.policyIDList);
    const single = String(input.policyID ?? "").trim();
    if (!single && ids.length === 0) throw new Error("provide policyID or policyIDList");
    if (single && ids.length > 0) throw new Error("provide policyID or policyIDList, not both");
    if (!present(input.categories) && !present(input.tags) && !present(input.reportFields)) {
      throw new Error("provide at least one of categories, tags or reportFields");
    }
    for (const a of [input.categoriesAction, input.reportFieldsAction]) {
      if (a !== undefined && a !== "merge" && a !== "replace") {
        throw new Error("mode must be merge or replace");
      }
    }

    const job: Record<string, unknown> = {
      type: "update",
      inputSettings: single
        ? { type: "policy", policyID: single }
        : { type: "policy", policyIDList: ids },
    };
    if (present(input.categories)) {
      job.categories = {
        action: input.categoriesAction ?? "merge",
        data: objectList("categories", input.categories),
      };
    }
    if (present(input.tags)) job.tags = { data: objectList("tags", input.tags) };
    if (present(input.reportFields)) {
      job.reportFields = {
        action: input.reportFieldsAction ?? "merge",
        data: objectList("reportFields", input.reportFields),
      };
    }
    const response = await runJob(ctx, job as { type: string });
    return { response };
  },
};

export default updatePolicy;
