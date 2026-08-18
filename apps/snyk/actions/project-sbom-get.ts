import type { ActionDefinition } from "@w6w/types";
import { resolveOrg, SnykClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /orgs/{org_id}/projects/{project_id}/sbom` — verified against Snyk's
 * own API document (`getSbom`).
 *
 * Generates a Software Bill of Materials for a project. `format` is a
 * **required** query parameter and there is no default: CycloneDX and SPDX are
 * different documents, and Snyk will not choose for you.
 */
const action: ActionDefinition = {
  key: "project-sbom-get",
  type: "read",
  resource: "project",
  title: "Get a project's SBOM",
  description: "Generate a Software Bill of Materials for one project.",
  params: [
    ORG_PARAM,
    { key: "projectId", label: "Project ID", type: "string", required: true, default: "" },
    {
      key: "format",
      label: "Format",
      type: "select",
      required: true,
      default: "cyclonedx1.6+json",
      options: [
        { value: "cyclonedx1.6+json", label: "CycloneDX 1.6 (JSON)" },
        { value: "cyclonedx1.5+json", label: "CycloneDX 1.5 (JSON)" },
        { value: "cyclonedx1.4+json", label: "CycloneDX 1.4 (JSON)" },
        { value: "cyclonedx1.6+xml", label: "CycloneDX 1.6 (XML)" },
        { value: "spdx2.3+json", label: "SPDX 2.3 (JSON)" },
      ],
      hint: "Snyk requires an explicit format — the documents are not interchangeable.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    const format = String(p.format ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");
    if (!format) throw new Error("`format` is required — Snyk has no default SBOM format");

    const org = resolveOrg(ctx.connection, p.orgId);
    ctx.log("info", "getting Snyk SBOM", { org, projectId, format });

    return await new SnykClient(ctx).request(
      `/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/sbom`,
      { query: { format } },
    );
  },
};

export default action;
