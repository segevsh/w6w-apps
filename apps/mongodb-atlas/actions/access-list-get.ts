import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, projectId, query } from "../lib/client.ts";
import { PAGE_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /api/atlas/v2/groups/{groupId}/accessList` — who may reach the
 * clusters, by address.
 *
 * ## This is the perimeter, and one entry can remove it
 *
 * An IP access list entry is what lets a connection be attempted at all — a
 * correct username and password from an address that is not on this list gets
 * a timeout, not a rejection. It applies **per project**, to every cluster in
 * it.
 *
 * `0.0.0.0/0` means the entire internet. It is a legitimate entry for a
 * cluster fronted by its own authentication and network controls, and it is
 * also what somebody adds at 2am to make a deploy work and never removes. This
 * action flags it explicitly, because in a list of a dozen CIDR blocks it does
 * not stand out.
 *
 * ## Entries expire, and expiry is invisible until it happens
 *
 * `deleteAfterDate` removes an entry automatically. That is the right way to
 * grant temporary access and a fine way to lose production access at a time
 * nobody chose, so this counts the ones that are going to disappear.
 */
const action: ActionDefinition = {
  key: "access-list-get",
  type: "read",
  resource: "access-list",
  title: "List IP access entries",
  description:
    "The project's IP access list — the perimeter for every cluster in it. Flags `0.0.0.0/0`, " +
    "which is the whole internet, and counts entries with an expiry date.",
  params: [PROJECT_PARAM, ...PAGE_PARAMS],
  output: [
    { key: "entries", type: "array", label: "The access-list entries" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "values", type: "array", label: "Just the addresses and CIDR blocks" },
    { key: "openToInternet", type: "boolean", label: "Whether 0.0.0.0/0 is present" },
    { key: "expiringCount", type: "number", label: "How many will disappear on their own" },
    { key: "totalCount", type: "number", label: "Across all pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);

    const { results, totalCount } = await new AtlasClient(ctx).list<{
      ipAddress?: string;
      cidrBlock?: string;
      awsSecurityGroup?: string;
      comment?: string;
      deleteAfterDate?: string;
    }>(`/api/atlas/v2/groups/${id}/accessList`, {
      query: query({
        itemsPerPage: Math.min(500, Math.max(1, Number(p.itemsPerPage ?? 100))),
        pageNum: Math.max(1, Number(p.pageNum ?? 1)),
      }),
    });

    const values = results
      .map((entry) => entry?.cidrBlock ?? entry?.ipAddress ?? entry?.awsSecurityGroup)
      .filter(Boolean) as string[];
    const openToInternet = values.some((value) => value === "0.0.0.0/0");
    const expiringCount = results.filter((entry) => Boolean(entry?.deleteAfterDate)).length;

    if (openToInternet) {
      ctx.log(
        "warn",
        "this Atlas project's access list contains 0.0.0.0/0 — every cluster in it is reachable " +
          "from anywhere",
        { count: results.length },
      );
    }

    return {
      entries: results,
      count: results.length,
      values,
      openToInternet,
      expiringCount,
      totalCount,
    };
  },
};

export default action;
