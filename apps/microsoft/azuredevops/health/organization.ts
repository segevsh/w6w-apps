/**
 * Can this connection reach its own organization, and what can its token see?
 *
 * The failure this exists for is not an outage. Azure DevOps personal access
 * tokens are **scoped per area** — Code, Build, Work Items, Project and Team —
 * and a token missing a scope does not answer `403`. It answers **`404`**, as
 * though the resource did not exist.
 *
 * So a workflow whose token lost the Work Items scope does not report a
 * permission problem; it reports that the work item is gone. The two are
 * indistinguishable from a single call, and only one of them is fixable in the
 * Azure DevOps UI.
 *
 * This check reads the projects the token can see and reports the count. Zero
 * visible projects on a real organization is almost always a missing
 * **Project and Team (read)** scope, and saying so is the whole point.
 *
 * A `302` is reported specifically, because it is how Azure DevOps rejects a
 * credential and it is not what anyone expects.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_VERSION, BASE_URL, organizationFromConnection } from "../lib/client.ts";

const organization: HealthCheckDefinition = {
  key: "organization",
  title: "Organization reachability",
  description:
    "Whether this connection's organization answers and what its token can see. A missing scope " +
    "answers 404 rather than 403, so zero visible projects usually means a scope, not an outage.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 600,

  async check(_input, ctx) {
    let org: string;
    try {
      org = organizationFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "this connection has no organization recorded" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(
        `${BASE_URL}/${encodeURIComponent(org)}/_apis/projects?api-version=${API_VERSION}&$top=100`,
        { headers: { accept: "application/json" }, redirect: "manual" },
      );
    } catch (err) {
      return { state: "down", message: `could not reach Azure DevOps: ${String(err)}` };
    }

    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel();
      // Not what anyone expects, so it is named rather than left as "3xx".
      return {
        state: "unknown",
        message: "redirected to a sign-in page — the token has expired or been revoked",
      };
    }
    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      return { state: "unknown", message: "the token was rejected" };
    }
    if (res.status === 404) {
      await res.body?.cancel();
      return { state: "down", message: `no organization named "${org}" answered` };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "down", message: `Azure DevOps answered ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { count?: number; value?: unknown[] }
      | null;
    const projects = body?.value ?? [];

    if (projects.length === 0) {
      return {
        state: "degraded",
        message:
          `${org} answers, but this token can see no projects — on a real organization that is a ` +
          "missing Project and Team (read) scope rather than an empty account",
      };
    }
    return {
      state: "ok",
      message: `${org}: ${projects.length} projects visible`,
      ttlSeconds: 600,
    };
  },
};

export default organization;
