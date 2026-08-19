import type { ActionDefinition } from "@w6w/types";
import { bucketName, emptyToUndefined, json, StorageClient } from "../lib/client.ts";
import { BUCKET_PARAM } from "../lib/params.ts";

/**
 * `PATCH /b/{bucket}` — change a bucket's settings.
 *
 * ## What cannot be changed
 *
 * The **name** and the **location**. Neither is a setting; both are decided at
 * creation, and changing either means a new bucket and a copy of everything in
 * it. This action does not offer them, so the attempt does not fail obscurely.
 *
 * ## Turning uniform access off is a one-way door for 90 days
 *
 * Uniform bucket-level access can be disabled only within **90 days** of being
 * enabled. After that Google refuses, permanently. So "turn it on and see" is
 * a decision with a deadline attached, and the API's error at day 91 explains
 * none of that.
 *
 * ## Versioning changes what a delete means, retroactively for nothing
 *
 * Turning it on protects objects written **from then on**. It does not recover
 * anything already overwritten. Turning it off does not delete the versions
 * already kept — they carry on costing storage until a lifecycle rule removes
 * them, which is the usual reason a bucket's bill does not fall when somebody
 * "turned versioning off".
 *
 * ## A lifecycle rule set replaces, it does not merge
 *
 * Sending `lifecycle` overwrites the whole rule array. A PATCH that means to
 * add one rule and sends only that rule deletes every other one, silently and
 * successfully.
 */
const action: ActionDefinition = {
  key: "bucket-update",
  type: "perform",
  resource: "bucket",
  title: "Update a bucket",
  description:
    "Change versioning, storage class, access settings or lifecycle rules. Lifecycle rules " +
    "REPLACE the whole set rather than merging, and uniform access can only be turned off within " +
    "90 days of turning it on.",
  idempotent: true,
  params: [
    BUCKET_PARAM,
    {
      key: "versioning",
      label: "Object Versioning",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "On" },
        { value: "false", label: "Off" },
      ],
      hint: "Turning it off does not remove the versions already kept — they keep costing.",
    },
    {
      key: "storageClass",
      label: "Default Storage Class",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "STANDARD", label: "Standard" },
        { value: "NEARLINE", label: "Nearline — 30-day minimum" },
        { value: "COLDLINE", label: "Coldline — 90-day minimum" },
        { value: "ARCHIVE", label: "Archive — 365-day minimum" },
      ],
      hint: "This applies to NEW objects only; existing ones keep their class.",
    },
    {
      key: "publicAccessPrevention",
      label: "Prevent Public Access",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "enforced", label: "Enforced — cannot be made public" },
        { value: "inherited", label: "Inherited — the org policy decides" },
      ],
    },
    {
      key: "confirmAllowPublic",
      label: "I am removing the block on public access",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "publicAccessPrevention" }, "inherited"] },
    },
    {
      key: "lifecycle",
      label: "Lifecycle Rules",
      type: "json",
      default: "",
      advanced: true,
      hint: "REPLACES every existing rule. Send the full set, or a rule you meant to add will " +
        "quietly remove the others.",
    },
    {
      key: "labels",
      label: "Labels",
      type: "json",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "bucket", type: "object", label: "The bucket as it now stands" },
    { key: "name", type: "string", label: "Its name" },
    { key: "changed", type: "array", label: "The fields this call submitted" },
    { key: "lifecycleRuleCount", type: "number", label: "Rules now in force" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = bucketName(p.bucket);

    const prevention = String(p.publicAccessPrevention ?? "").trim();
    if (prevention === "inherited" && p.confirmAllowPublic !== true) {
      throw new Error(
        "set `confirmAllowPublic` — `enforced` is what stops this bucket being made public by " +
          "anyone, whatever the IAM policy says, and removing it is not something to do while " +
          "changing something else",
      );
    }

    const versioning = String(p.versioning ?? "").trim();
    const rules = json(p.lifecycle, "lifecycle");
    if (rules !== undefined && !Array.isArray(rules)) {
      throw new Error("`lifecycle` must be an array of rule objects");
    }

    const body = emptyToUndefined({
      versioning: versioning === "" ? undefined : { enabled: versioning === "true" },
      storageClass: p.storageClass,
      iamConfiguration: prevention ? { publicAccessPrevention: prevention } : undefined,
      // This replaces the array; it does not merge into it.
      lifecycle: rules ? { rule: rules } : undefined,
      labels: json(p.labels, "labels"),
    });
    if (!body) throw new Error("nothing to change — give at least one setting");

    if (rules) {
      ctx.log(
        "warn",
        "replacing this bucket's lifecycle rules — any rule not in this call is now gone",
        { name, ruleCount: rules.length },
      );
    }

    const bucket = await new StorageClient(ctx).request<{
      name?: string;
      lifecycle?: { rule?: unknown[] };
    }>(`/b/${encodeURIComponent(name)}`, { method: "PATCH", body });

    return {
      bucket,
      name: bucket?.name ?? name,
      changed: Object.keys(body),
      lifecycleRuleCount: bucket?.lifecycle?.rule?.length ?? 0,
    };
  },
};

export default action;
