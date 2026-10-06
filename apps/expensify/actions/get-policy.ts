import type { ActionDefinition } from "@w6w/types";
import { compact, opts, runJob, strArray } from "../lib/client.ts";

interface Input {
  policyIDList: string[] | string;
  fields: string[] | string;
  userEmail?: string;
}

const FIELDS = ["categories", "reportFields", "tags", "tax", "employees"];

/** `get` / `policy` — the Policy getter. */
const getPolicy: ActionDefinition<Input> = {
  key: "get-policy",
  type: "read",
  resource: "policy",
  title: "Get Policy Details",
  description:
    "Fetch categories, report fields, tags, tax rates and/or employees for one or more policies.",
  params: [
    {
      key: "policyIDList",
      label: "Policy IDs",
      type: "array",
      item: { type: "string" },
      required: true,
    },
    {
      key: "fields",
      label: "Fields",
      type: "multiselect",
      required: true,
      options: opts(FIELDS),
      hint: "Which parts of each policy to return.",
    },
    {
      key: "userEmail",
      label: "User email",
      type: "string",
      hint:
        "Read the policies as this user. You must have been granted third-party access by that user or domain.",
    },
  ],
  output: [{ key: "policyInfo", type: "object", label: "Policy details keyed by policy ID" }],

  async execute(input, ctx) {
    const policyIDList = strArray(input.policyIDList);
    if (policyIDList.length === 0) throw new Error("policyIDList is required");
    const fields = strArray(input.fields);
    if (fields.length === 0) throw new Error("fields is required");
    const bad = fields.filter((f) => !FIELDS.includes(f));
    if (bad.length > 0) throw new Error(`unsupported fields: ${bad.join(", ")}`);
    const res = await runJob(ctx, {
      type: "get",
      inputSettings: compact({
        type: "policy",
        fields,
        policyIDList,
        userEmail: input.userEmail,
      }),
    });
    return { policyInfo: res.policyInfo ?? {} };
  },
};

export default getPolicy;
