import type { ActionDefinition } from "@w6w/types";
import { compact, NewRelicClient } from "../lib/client.ts";
import { guidParam } from "../lib/params.ts";

/**
 * `changeTrackingCreateDeployment` — record that something shipped.
 *
 * ## The most useful thing a CI workflow can send New Relic
 *
 * A deployment marker draws a line on every chart for that entity, and every
 * subsequent question about a regression starts with "did anything ship". A
 * marker with a commit SHA and a changelog turns that from an archaeology
 * exercise into a click.
 *
 * ## The timestamp must be within a day, either way
 *
 * From New Relic's own documentation: `timestamp` must be within **±24 hours**
 * of now. A backfill of last month's deployments is rejected, and a clock skew
 * of more than a day on a build agent rejects everything it sends. Omitting it
 * means now, which is what a CI job wants anyway.
 *
 * ## `entityGuid` and `version` are the only required fields
 *
 * And `version` is what appears on the chart, so a version of `latest` produces
 * a timeline of identical markers. A build number or a commit SHA is the useful
 * value.
 */
const DEPLOYMENT_TYPES = ["BASIC", "BLUE_GREEN", "CANARY", "ROLLING", "SHADOW", "OTHER"];

const action: ActionDefinition = {
  key: "deployment-create",
  type: "perform",
  resource: "deployment",
  title: "Record a deployment",
  description:
    "Mark a deployment on an entity's charts — the thing that makes 'did anything ship' " +
    "answerable. The timestamp must be within 24 hours of now, either direction.",
  idempotent: false,
  params: [
    guidParam("Entity GUID", "The application that was deployed. From `entity-search`."),
    {
      key: "version",
      label: "Version",
      type: "string",
      required: true,
      default: "",
      hint: "What appears on the chart. A build number or commit SHA — `latest` produces a " +
        "timeline of identical markers.",
    },
    { key: "user", label: "Deployed By", type: "string", default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    { key: "commit", label: "Commit", type: "string", default: "", hint: "SHA or identifier." },
    {
      key: "changelog",
      label: "Changelog",
      type: "text",
      default: "",
      hint: "A URL or a summary of what changed.",
    },
    {
      key: "deepLink",
      label: "Deep Link",
      type: "string",
      default: "",
      hint: "Back to the build — Jenkins, GitHub Actions, Argo.",
    },
    {
      key: "deploymentType",
      label: "Type",
      type: "select",
      default: "BASIC",
      options: DEPLOYMENT_TYPES.map((value) => ({ value, label: value })),
    },
    {
      key: "groupId",
      label: "Group",
      type: "string",
      default: "",
      advanced: true,
      hint: "Ties one release across several entities together.",
    },
    {
      key: "timestamp",
      label: "At",
      type: "string",
      default: "",
      advanced: true,
      hint: "ISO 8601 or epoch milliseconds. Must be within 24 hours of now — a backfill is " +
        "rejected, and so is a build agent with a skewed clock.",
    },
  ],
  output: [
    { key: "deploymentId", type: "string", label: "New Relic's id for the marker" },
    { key: "entityGuid", type: "string", label: "The entity marked" },
    { key: "version", type: "string", label: "What appears on the chart" },
    { key: "timestamp", type: "number", label: "When it was recorded, in epoch milliseconds" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const guid = String(p.guid ?? "").trim();
    const version = String(p.version ?? "").trim();
    if (!guid) throw new Error("`guid` is required");
    if (!version) throw new Error("`version` is required");

    const timestamp = parseTimestamp(p.timestamp);
    if (timestamp !== undefined) {
      const drift = Math.abs(timestamp - Date.now());
      if (drift > 24 * 60 * 60 * 1000) {
        throw new Error(
          `\`timestamp\` is ${Math.round(drift / 3_600_000)} hours from now, and New Relic ` +
            "rejects anything more than 24. Deployments cannot be backfilled, and a build agent " +
            "with a skewed clock will have everything it sends refused",
        );
      }
    }

    const type = String(p.deploymentType ?? "BASIC").toUpperCase();
    if (!DEPLOYMENT_TYPES.includes(type)) {
      throw new Error(`\`deploymentType\` must be one of ${DEPLOYMENT_TYPES.join(", ")}`);
    }

    const data = await new NewRelicClient(ctx).gql<{
      changeTrackingCreateDeployment?: {
        deploymentId?: string;
        entityGuid?: string;
        version?: string;
        timestamp?: number;
      };
    }>(
      `mutation($deployment: ChangeTrackingDeploymentInput!) {
        changeTrackingCreateDeployment(deployment: $deployment) {
          deploymentId entityGuid version timestamp deploymentType
        }
      }`,
      {
        deployment: compact({
          entityGuid: guid,
          version,
          user: p.user,
          description: p.description,
          commit: p.commit,
          changelog: p.changelog,
          deepLink: p.deepLink,
          deploymentType: type,
          groupId: p.groupId,
          timestamp,
        }),
      },
    );

    const deployment = data?.changeTrackingCreateDeployment;
    // Unlike the tagging mutations this one has no `errors` payload, so the
    // only confirmation is that an id came back. A null payload with no
    // GraphQL error means nothing was recorded.
    if (!deployment?.deploymentId) {
      throw new Error(
        "New Relic accepted the request but returned no deployment id, which means nothing was " +
          "recorded. The usual cause is an entityGuid the key cannot write to",
      );
    }

    ctx.log("info", "recorded a New Relic deployment", {
      version,
      deploymentType: type,
      deploymentId: deployment?.deploymentId,
    });

    return {
      deploymentId: deployment?.deploymentId,
      entityGuid: deployment?.entityGuid ?? guid,
      version: deployment?.version ?? version,
      timestamp: deployment?.timestamp,
    };
  },
};

/** ISO 8601 or epoch milliseconds, into the milliseconds New Relic wants. */
export function parseTimestamp(value: unknown): number | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  if (/^\d+$/.test(text)) {
    const number = Number(text);
    // Seconds would land in 1970, which is well outside the 24-hour window and
    // would fail with a message about the window rather than about the units.
    return number < 100_000_000_000 ? number * 1000 : number;
  }
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) {
    throw new Error(`\`timestamp\` is neither epoch milliseconds nor a parseable date: ${text}`);
  }
  return parsed;
}

export default action;
