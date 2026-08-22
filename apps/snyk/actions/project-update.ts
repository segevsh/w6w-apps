import type { ActionDefinition } from "@w6w/types";
import { compact, csv, resolveOrg, SnykClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `PATCH /orgs/{org_id}/projects/{project_id}` — verified against Snyk's own
 * API document (`updateOrgProject`).
 *
 * **JSON:API write shape.** The body is not a flat object of attributes: it is
 * `{data: {id, type, attributes, relationships}}`, and the `id` and `type` must
 * be present and must match the resource. This action builds that envelope, so
 * a caller supplies attributes and nothing else.
 */
const action: ActionDefinition = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update a project",
  description: "Change a project's tags, environment, lifecycle or business criticality.",
  idempotent: true,
  params: [
    ORG_PARAM,
    { key: "projectId", label: "Project ID", type: "string", required: true, default: "" },
    {
      key: "businessCriticality",
      label: "Business Criticality",
      type: "multiselect",
      default: [],
      options: [
        { value: "critical", label: "Critical" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
    {
      key: "environment",
      label: "Environment",
      type: "multiselect",
      default: [],
      options: [
        { value: "frontend", label: "Frontend" },
        { value: "backend", label: "Backend" },
        { value: "internal", label: "Internal" },
        { value: "external", label: "External" },
        { value: "mobile", label: "Mobile" },
        { value: "saas", label: "SaaS" },
        { value: "onprem", label: "On-prem" },
        { value: "hosted", label: "Hosted" },
        { value: "distributed", label: "Distributed" },
      ],
    },
    {
      key: "lifecycle",
      label: "Lifecycle",
      type: "multiselect",
      default: [],
      options: [
        { value: "production", label: "Production" },
        { value: "development", label: "Development" },
        { value: "sandbox", label: "Sandbox" },
      ],
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      default: "",
      placeholder: '[{"key":"team","value":"platform"}]',
      hint: "Snyk tags are key/value pairs, and this replaces the whole set.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Updated project" },
    { key: "jsonapi", type: "object", label: "JSON:API metadata" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");

    let tags: unknown = undefined;
    if (typeof p.tags === "string" && p.tags.trim()) {
      try {
        tags = JSON.parse(p.tags);
      } catch {
        throw new Error("`tags` is not valid JSON");
      }
    } else if (Array.isArray(p.tags)) tags = p.tags;

    const attributes = compact({
      business_criticality: csv(p.businessCriticality),
      environment: csv(p.environment),
      lifecycle: csv(p.lifecycle),
      tags,
    });
    if (Object.keys(attributes).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    const org = resolveOrg(ctx.connection, p.orgId);
    ctx.log("info", "updating Snyk project", { org, projectId, fields: Object.keys(attributes) });

    return await new SnykClient(ctx).request(
      `/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}`,
      {
        method: "PATCH",
        // JSON:API: the resource identity travels in the body alongside the
        // attributes, and Snyk rejects a bare attribute object.
        body: { data: { id: projectId, type: "project", attributes } },
      },
    );
  },
};

export default action;
