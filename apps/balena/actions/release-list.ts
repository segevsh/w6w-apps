import type { ActionDefinition } from "@w6w/types";
import { BalenaClient, odataString } from "../lib/client.ts";

/**
 * `GET /v7/release` — what has been built for a fleet.
 *
 * ## A release exists before it succeeds
 *
 * `status` runs `running` → `success` or `failed`, and a release row appears
 * as soon as a build starts. So "the latest release" taken from a
 * created-at ordering can be a build that is still going, or one that failed
 * ten minutes ago — neither of which any device will run. This action returns
 * successful releases by default and reports the others separately.
 *
 * ## `is_invalidated` is how a release is withdrawn
 *
 * Not deleted — marked. An invalidated release stops being a candidate for
 * the fleet's target, and devices already running it carry on. That is a
 * deliberate design: withdrawing a bad release does not take a fleet down, it
 * just stops the spread. A workflow choosing a rollback target has to filter
 * them out.
 *
 * ## Two version schemes, both live
 *
 * `commit` is the git-style hash, `raw_version`/`semver` is the semantic
 * version balena computes. `revision` counts builds within a version. Both
 * identify a release for pinning; the semver is the one humans recognise.
 */
const action: ActionDefinition = {
  key: "release-list",
  type: "search",
  resource: "release",
  title: "List releases",
  description:
    "Builds for a fleet. A release row exists as soon as a build STARTS, so the newest one may " +
    "be running or failed — this returns successful releases by default and counts the rest. " +
    "Also separates INVALIDATED releases, which are withdrawn rather than deleted.",
  params: [
    {
      key: "fleet",
      label: "Fleet",
      type: "string",
      required: true,
      default: "",
      placeholder: "myorg/my-fleet",
      hint: "Slug or numeric id.",
    },
    {
      key: "includeUnsuccessful",
      label: "Include running and failed builds",
      type: "boolean",
      default: false,
    },
    {
      key: "includeInvalidated",
      label: "Include withdrawn releases",
      type: "boolean",
      default: false,
    },
    { key: "limit", label: "Limit", type: "number", default: 20 },
  ],
  output: [
    { key: "releases", type: "array", label: "The releases, newest first" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "latest", type: "object", label: "The newest one this action would pin to" },
    { key: "commits", type: "array", label: "Just the commits" },
    { key: "versions", type: "array", label: "The semantic versions" },
    { key: "failedCount", type: "number", label: "Builds that did not succeed" },
    { key: "runningCount", type: "number", label: "Builds still going" },
    { key: "invalidatedCount", type: "number", label: "Withdrawn — devices on them keep running" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const reference = String(p.fleet ?? "").trim();
    if (!reference) throw new Error("`fleet` is required — a slug like `org/name`, or an id");

    const client = new BalenaClient(ctx);
    const fleet = await client.one<{ id?: number; slug?: string }>("application", {
      query: {
        $select: "id,slug",
        $filter: /^\d+$/.test(reference)
          ? `id eq ${Number(reference)}`
          : `slug eq ${odataString(reference)}`,
      },
    });
    if (!fleet) throw new Error(`no fleet matched ${JSON.stringify(reference)}`);

    const all = await client.list<{
      id?: number;
      commit?: string;
      raw_version?: string;
      semver?: string;
      revision?: number | null;
      status?: string;
      is_invalidated?: boolean;
      created_at?: string;
      end_timestamp?: string | null;
    }>("release", {
      query: {
        $select: "id,commit,raw_version,semver,revision,status,is_invalidated,created_at," +
          "end_timestamp",
        $filter: `belongs_to__application eq ${fleet.id}`,
        $orderby: "created_at desc",
        $top: Math.max(1, Math.min(200, Number(p.limit ?? 20))),
      },
    });

    const releases = all.filter((release) => {
      if (p.includeUnsuccessful !== true && release?.status !== "success") return false;
      if (p.includeInvalidated !== true && release?.is_invalidated === true) return false;
      return true;
    });

    const invalidatedCount = all.filter((release) => release?.is_invalidated === true).length;
    if (invalidatedCount && p.includeInvalidated !== true) {
      ctx.log(
        "info",
        "some releases are invalidated — withdrawn rather than deleted, so devices " +
          "already running them carry on",
        { invalidatedCount },
      );
    }

    return {
      releases,
      count: releases.length,
      // The newest release a device could actually be pinned to.
      latest: releases[0],
      commits: releases.map((release) => release?.commit).filter(Boolean),
      versions: releases.map((release) => release?.raw_version ?? release?.semver).filter(Boolean),
      failedCount: all.filter((release) => release?.status === "failed").length,
      runningCount: all.filter((release) => release?.status === "running").length,
      invalidatedCount,
    };
  },
};

export default action;
