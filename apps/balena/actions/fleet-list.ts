import type { ActionDefinition } from "@w6w/types";
import { BalenaClient, odataString } from "../lib/client.ts";

/**
 * `GET /v7/application` — the fleets, and a genuine trap in the obvious call.
 *
 * ## The unfiltered listing includes strangers' fleets
 *
 * balena's documentation notes it: "this will also include all public fleets
 * of the platform". Measured live, it is worse than a note — the request
 * succeeds with **no `Authorization` header at all**, returning other
 * people's public fleets with a 200.
 *
 * So the naive listing has two failure modes that look like success. A
 * workflow lists "our fleets" and gets a few hundred strangers' hobby
 * projects mixed in; and a workflow whose credential was revoked keeps
 * getting a plausible answer instead of a 401.
 *
 * This action asks balena for fleets belonging to organizations the caller is
 * a member of, which is the question people mean. `includePublic` opts back
 * into the platform-wide behaviour, and the result always reports how many
 * public fleets were excluded — because a count of zero from a scoped query is
 * a very different thing from a count of zero overall.
 *
 * ## Archived fleets are still listed
 *
 * `is_archived` marks a fleet kept for its history. It has no target release
 * and takes no devices, and counting it is counting something retired.
 */
const action: ActionDefinition = {
  key: "fleet-list",
  type: "search",
  resource: "fleet",
  title: "List fleets",
  description:
    "Fleets in the organizations this credential belongs to. The unfiltered balena listing " +
    "returns the platform's PUBLIC fleets too — and does so with no credential at all — so this " +
    "scopes by organization membership and reports what it excluded.",
  params: [
    {
      key: "organization",
      label: "Organization handle",
      type: "string",
      default: "",
      hint: "Narrow to one organization. Empty means every organization this credential is a " +
        "member of.",
    },
    {
      key: "includeArchived",
      label: "Include archived fleets",
      type: "boolean",
      default: false,
      hint: "An archived fleet is kept for its history: no target release, no devices.",
    },
    {
      key: "includePublic",
      label: "Include the platform's public fleets",
      type: "boolean",
      default: false,
      hint: "This is balena's own default and it returns strangers' fleets. Almost never what " +
        "somebody means by 'our fleets'.",
    },
  ],
  output: [
    { key: "fleets", type: "array", label: "The fleets" },
    { key: "count", type: "number", label: "How many" },
    { key: "slugs", type: "array", label: "`org/fleet` — what the CLI and dashboard use" },
    { key: "ids", type: "array", label: "Numeric ids, which the API takes" },
    { key: "archivedCount", type: "number", label: "Kept for history, taking no devices" },
    { key: "publicExcluded", type: "number", label: "Strangers' fleets left out" },
    { key: "notTrackingLatest", type: "array", label: "Fleets pinned off the latest release" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new BalenaClient(ctx);

    const select = "id,app_name,slug,is_public,is_archived,should_track_latest_release," +
      "should_be_running__release,created_at,is_for__device_type";

    const organization = String(p.organization ?? "").trim();
    // Scoped by membership, because the unscoped call answers for the whole
    // platform — and answers it to nobody in particular.
    const filters: string[] = [];
    if (p.includePublic !== true) {
      filters.push(
        organization
          ? `organization/any(o:o/handle eq ${odataString(organization)})`
          : "organization/any(o:o/organization_membership/any(m:m/user/any(u:u/id ne null)))",
      );
    } else if (organization) {
      filters.push(`organization/any(o:o/handle eq ${odataString(organization)})`);
    }
    if (p.includeArchived !== true) filters.push("is_archived eq false");

    const fleets = await client.list<{
      id?: number;
      app_name?: string;
      slug?: string;
      is_public?: boolean;
      is_archived?: boolean;
      should_track_latest_release?: boolean;
    }>("application", {
      query: {
        $select: select,
        $filter: filters.length ? filters.join(" and ") : undefined,
        $orderby: "app_name asc",
      },
    });

    const publicExcluded = fleets.filter((fleet) => fleet?.is_public === true).length;
    if (p.includePublic === true) {
      ctx.log(
        "warn",
        "this listing includes the platform's PUBLIC fleets, which belong to other people — " +
          "balena returns them to any caller, including one with no credential",
        { count: fleets.length },
      );
    }

    return {
      fleets,
      count: fleets.length,
      slugs: fleets.map((fleet) => fleet?.slug).filter(Boolean),
      ids: fleets.map((fleet) => fleet?.id).filter(Boolean),
      archivedCount: fleets.filter((fleet) => fleet?.is_archived === true).length,
      publicExcluded: p.includePublic === true ? 0 : publicExcluded,
      // A fleet not tracking latest stays where it is until somebody moves it.
      notTrackingLatest: fleets
        .filter((fleet) => fleet?.should_track_latest_release === false)
        .map((fleet) => fleet?.slug)
        .filter(Boolean),
    };
  },
};

export default action;
