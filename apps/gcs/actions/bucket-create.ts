import type { ActionDefinition } from "@w6w/types";
import { compact, earlyDeletionNote, json, StorageClient } from "../lib/client.ts";

/**
 * `POST /b?project={id}` — create a bucket.
 *
 * ## The name is globally unique across all of Google Cloud
 *
 * Not unique within your project — unique across every project on Earth. So
 * `images` was taken years ago, and a name collision is a **409** that reads
 * as though it exists in *your* account when it belongs to a stranger. It also
 * means bucket names leak: choosing `acme-corp-payroll` publishes that the
 * name is in use.
 *
 * ## Location is permanent
 *
 * There is no moving a bucket. Changing region means creating another and
 * copying every object, which for anything large is a transfer cost and a
 * cutover. `US` and `EU` are multi-region (more expensive, more available);
 * `europe-west1` and friends are single-region.
 *
 * ## Uniform access is on by default here, and off in the API
 *
 * Uniform bucket-level access disables per-object ACLs and makes IAM the only
 * way permissions are expressed. That is the configuration Google recommends
 * and the one that makes an accidental single-object exposure impossible. This
 * action defaults it **on**; the API defaults it off.
 *
 * ## A cold storage class is not automatically cheaper
 *
 * NEARLINE, COLDLINE and ARCHIVE bill a **minimum duration per object** — 30,
 * 90 and 365 days. Objects that turn over faster than that cost *more* in a
 * cold class than in STANDARD, and nothing warns about it.
 */
const action: ActionDefinition = {
  key: "bucket-create",
  type: "perform",
  resource: "bucket",
  title: "Create a bucket",
  description:
    "Create a bucket. The name is unique across ALL of Google Cloud, the location is permanent, " +
    "and a cold storage class bills a minimum duration per object — which can cost more than " +
    "STANDARD for anything short-lived.",
  idempotent: false,
  params: [
    {
      key: "project",
      label: "Project ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      hint: "Globally unique across all of Google Cloud — a 409 here often means somebody else " +
        "has it, and the name itself becomes publicly known.",
    },
    {
      key: "location",
      label: "Location",
      type: "string",
      required: true,
      default: "US",
      placeholder: "EU or europe-west1",
      hint: "PERMANENT. Moving means creating another bucket and copying everything.",
    },
    {
      key: "storageClass",
      label: "Storage Class",
      type: "select",
      default: "STANDARD",
      options: [
        { value: "STANDARD", label: "Standard — no minimum duration" },
        { value: "NEARLINE", label: "Nearline — 30-day minimum per object" },
        { value: "COLDLINE", label: "Coldline — 90-day minimum per object" },
        { value: "ARCHIVE", label: "Archive — 365-day minimum per object" },
      ],
      hint: "The minimum is billed whether or not the object still exists.",
    },
    {
      key: "uniformAccess",
      label: "Uniform bucket-level access",
      type: "boolean",
      default: true,
      hint: "ON by default here, against the API's own default. It disables per-object ACLs, so " +
        "one object cannot be made public by accident.",
    },
    {
      key: "versioning",
      label: "Object Versioning",
      type: "boolean",
      default: false,
      hint: "On, an overwrite or delete keeps the previous version — and keeps paying for it " +
        "until a lifecycle rule removes it.",
    },
    {
      key: "publicAccessPrevention",
      label: "Prevent Public Access",
      type: "boolean",
      default: true,
      hint: "ON by default here. `enforced` means the bucket cannot be made public by anyone, " +
        "whatever the IAM policy says.",
    },
    {
      key: "lifecycle",
      label: "Lifecycle Rules",
      type: "json",
      default: "",
      advanced: true,
      hint: "The raw `lifecycle.rule` array. Beware archiving then deleting: the cold class's " +
        "minimum duration is billed anyway.",
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
    { key: "bucket", type: "object", label: "The bucket as created" },
    { key: "name", type: "string", label: "Its name" },
    { key: "location", type: "string", label: "Where it now permanently lives" },
    { key: "minimumDurationNote", type: "string", label: "What early deletion will cost" },
    { key: "uniformAccess", type: "boolean", label: "Whether per-object ACLs are disabled" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const name = String(p.name ?? "").trim();
    const location = String(p.location ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!name) throw new Error("`name` is required");
    if (!location) {
      throw new Error("`location` is required, and it cannot be changed once the bucket exists");
    }

    const storageClass = String(p.storageClass ?? "STANDARD");
    const uniformAccess = p.uniformAccess !== false;
    const lifecycleRules = json(p.lifecycle, "lifecycle");
    if (lifecycleRules !== undefined && !Array.isArray(lifecycleRules)) {
      throw new Error("`lifecycle` must be an array of rule objects");
    }

    const body = compact({
      name,
      location,
      storageClass,
      labels: json(p.labels, "labels"),
      lifecycle: lifecycleRules ? { rule: lifecycleRules } : undefined,
      iamConfiguration: {
        uniformBucketLevelAccess: { enabled: uniformAccess },
        publicAccessPrevention: p.publicAccessPrevention === false ? "inherited" : "enforced",
      },
      versioning: { enabled: p.versioning === true },
    });

    const bucket = await new StorageClient(ctx).request<{ name?: string; location?: string }>(
      "/b",
      { method: "POST", query: { project }, body },
    );

    const note = earlyDeletionNote(storageClass);
    ctx.log(
      note ? "warn" : "info",
      note ? `created a Cloud Storage bucket — ${note}` : "created a Cloud Storage bucket",
      {
        name,
        location,
        storageClass,
      },
    );

    return {
      bucket,
      name: bucket?.name ?? name,
      location: bucket?.location ?? location,
      minimumDurationNote: note,
      uniformAccess,
    };
  },
};

export default action;
