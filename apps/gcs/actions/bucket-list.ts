import type { ActionDefinition } from "@w6w/types";
import { query, StorageClient } from "../lib/client.ts";
import { PAGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /b?project={id}` — the buckets in a project.
 *
 * ## The project is required, and its absence is reported as its invalidity
 *
 * Measured live: a request with no usable credential and a bad project id
 * answers **400 "Project id: 0 is invalid or not found"** — not 401. Cloud
 * Storage validates the project before it validates the caller, so a missing
 * or wrong project id produces an error about projects even when the real
 * problem is the token, and vice versa.
 *
 * ## An empty list is usually a permissions answer
 *
 * A service account with no role on the project lists successfully and sees
 * nothing. There is no error, because listing is exactly what it is allowed to
 * do; it just cannot see any bucket. This action says so rather than returning
 * zero silently.
 *
 * ## What is worth reading off each bucket
 *
 * `storageClass` decides what it costs and, for anything but STANDARD, imposes
 * a minimum billed duration per object. `iamConfiguration.uniformBucketLevelAccess`
 * decides whether per-object ACLs work at all — with it on, every attempt to
 * make one object public fails, and the error talks about ACLs rather than
 * about the setting that disabled them.
 */
const action: ActionDefinition = {
  key: "bucket-list",
  type: "search",
  resource: "bucket",
  title: "List buckets",
  description:
    "The buckets in a project. An EMPTY result is usually a missing IAM role rather than an " +
    "empty project — listing succeeds and shows nothing.",
  params: [
    {
      key: "project",
      label: "Project ID",
      type: "string",
      required: true,
      default: "",
      hint: "Cloud Storage validates the project BEFORE the credential, so a wrong id here " +
        "produces an error about projects even when the token is the problem.",
    },
    {
      key: "prefix",
      label: "Name Prefix",
      type: "string",
      default: "",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "buckets", type: "array", label: "The buckets" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "names", type: "array", label: "Just the names" },
    { key: "uniformAccessCount", type: "number", label: "How many have per-object ACLs disabled" },
    { key: "nextPageToken", type: "string", label: "Absent on the last page" },
    { key: "visible", type: "boolean", label: "False when nothing at all was visible" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    if (!project) throw new Error("`project` is required to list buckets");

    const body = await new StorageClient(ctx).request<{
      items?: Array<{ name?: string; storageClass?: string; iamConfiguration?: unknown }>;
      nextPageToken?: string;
    }>("/b", {
      query: query({
        project,
        prefix: p.prefix,
        maxResults: Math.min(1000, Math.max(1, Number(p.maxResults ?? 100))),
        pageToken: p.pageToken,
      }),
    });

    const buckets = body?.items ?? [];
    const uniformAccessCount = buckets.filter((bucket) => {
      const iam = bucket?.iamConfiguration as
        | { uniformBucketLevelAccess?: { enabled?: boolean } }
        | undefined;
      return iam?.uniformBucketLevelAccess?.enabled === true;
    }).length;

    if (!buckets.length && !p.pageToken && !p.prefix) {
      ctx.log(
        "warn",
        "no Cloud Storage buckets were visible in this project — a service account with no IAM " +
          "role lists successfully and sees nothing",
        { project },
      );
    }

    return {
      buckets,
      count: buckets.length,
      names: buckets.map((bucket) => bucket?.name).filter(Boolean),
      uniformAccessCount,
      nextPageToken: body?.nextPageToken,
      visible: buckets.length > 0,
    };
  },
};

export default action;
