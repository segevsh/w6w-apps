import type { ActionDefinition } from "@w6w/types";
import { compact, VercelClient } from "../lib/client.ts";
import { PROJECT_PARAM, TEAM_PARAM } from "../lib/params.ts";

/**
 * `POST /v10/projects/{idOrName}/domains` — verified against Vercel's OpenAPI
 * document (`addProjectDomain`; body requires `name`).
 *
 * The response's `verified` flag is the one to read: adding a domain does not
 * make it live, it makes it pending whatever DNS record Vercel wants.
 */
const action: ActionDefinition = {
  key: "project-domain-add",
  type: "perform",
  resource: "domain",
  title: "Add a domain to a project",
  description: "Attach a domain to a project, optionally as a branch domain or a redirect.",
  // Adding the same domain twice ends with the domain attached once.
  idempotent: true,
  params: [
    TEAM_PARAM,
    PROJECT_PARAM,
    {
      key: "name",
      label: "Domain",
      type: "string",
      required: true,
      default: "",
      placeholder: "www.example.com",
    },
    {
      key: "gitBranch",
      label: "Git Branch",
      type: "string",
      default: "",
      hint: "Point this domain at a branch's deployments instead of production.",
    },
    {
      key: "redirect",
      label: "Redirect To",
      type: "string",
      default: "",
      hint: "Make this domain redirect to another one.",
    },
    {
      key: "redirectStatusCode",
      label: "Redirect Status Code",
      type: "select",
      default: null,
      options: [
        { value: 301, label: "301 Moved Permanently" },
        { value: 302, label: "302 Found" },
        { value: 307, label: "307 Temporary Redirect" },
        { value: 308, label: "308 Permanent Redirect" },
      ],
    },
  ],
  output: [
    { key: "name", type: "string", label: "Domain" },
    { key: "apexName", type: "string", label: "Apex name" },
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "verified", type: "boolean", label: "Verified" },
    { key: "verification", type: "array", label: "Required DNS records" },
    { key: "redirect", type: "string", label: "Redirect target" },
    { key: "gitBranch", type: "string", label: "Git branch" },
    { key: "createdAt", type: "number", label: "Created at (ms)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    const name = String(p.name ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");
    if (!name) throw new Error("`name` is required");

    const body = compact({
      name,
      gitBranch: p.gitBranch,
      redirect: p.redirect,
      redirectStatusCode: typeof p.redirectStatusCode === "number"
        ? p.redirectStatusCode
        : undefined,
    });

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "adding Vercel project domain", { projectId, name });

    return await client.request(`/v10/projects/${encodeURIComponent(projectId)}/domains`, {
      method: "POST",
      body,
    });
  },
};

export default action;
