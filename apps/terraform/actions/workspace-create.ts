import type { ActionDefinition } from "@w6w/types";
import { compact, document, flatten, TerraformClient } from "../lib/client.ts";

/**
 * `POST /api/v2/organizations/{org}/workspaces` — make a workspace.
 *
 * ## `auto-apply` defaults to off here, and that is the API's default too
 *
 * Worth stating because it is the one setting that decides whether this
 * workspace can change infrastructure without a human. Turning it on is a
 * deliberate act, and this action logs a warning when it is asked to.
 *
 * ## `terraform-version` unset means "whatever is newest"
 *
 * A workspace with no pinned version takes the newest Terraform the instance
 * offers, which changes when HashiCorp releases one. A configuration that
 * planned cleanly last week can fail on a new minor version, and nothing in
 * the workspace changed. Pin it.
 *
 * ## VCS-backed workspaces are not created this way
 *
 * Attaching a repository needs an `oauth-token-id` from a configured VCS
 * connection, and that connection is set up in the web interface. A workspace
 * created here is API-driven: configuration is uploaded, or runs are queued
 * against it directly.
 */
const action: ActionDefinition = {
  key: "workspace-create",
  type: "perform",
  resource: "workspace",
  title: "Create a workspace",
  description:
    "Create an API-driven workspace. Leaving the Terraform version unset means it tracks the " +
    "NEWEST release, so a configuration can start failing without anything changing.",
  idempotent: false,
  params: [
    {
      key: "organization",
      label: "Organization",
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
      hint: "Unique within the organisation, and it appears in the workspace's URL.",
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      default: "",
    },
    {
      key: "terraformVersion",
      label: "Terraform Version",
      type: "string",
      default: "",
      hint: "Pin one. Left blank the workspace tracks the newest release, and a new minor " +
        "version can break a configuration that planned cleanly yesterday.",
    },
    {
      key: "autoApply",
      label: "Auto-apply",
      type: "boolean",
      default: false,
      hint: "OFF by default. On, a successful plan applies itself — infrastructure changes with " +
        "no confirmation step anywhere.",
    },
    {
      key: "executionMode",
      label: "Execution Mode",
      type: "select",
      default: "remote",
      options: [
        { value: "remote", label: "Remote — runs in HCP Terraform" },
        { value: "local", label: "Local — the API only stores state" },
        { value: "agent", label: "Agent — runs on your own agents" },
      ],
      hint: "`local` means runs created through the API never execute; `agent` needs an agent " +
        "pool to be online.",
    },
    {
      key: "workingDirectory",
      label: "Working Directory",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated, applied after creation.",
    },
  ],
  output: [
    { key: "workspace", type: "object", label: "The flattened workspace" },
    { key: "id", type: "string", label: "Its id" },
    { key: "name", type: "string", label: "Its name" },
    { key: "autoApply", type: "boolean", label: "Whether it applies without confirmation" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organization = String(p.organization ?? "").trim();
    const name = String(p.name ?? "").trim();
    if (!organization) throw new Error("`organization` is required");
    if (!name) throw new Error("`name` is required");

    const autoApply = p.autoApply === true;
    const attributes = compact({
      "name": name,
      "description": p.description,
      "terraform-version": p.terraformVersion,
      "auto-apply": autoApply,
      "execution-mode": p.executionMode ?? "remote",
      "working-directory": p.workingDirectory,
    });
    // `auto-apply: false` is meaningful and `compact` drops only unset values,
    // so it survives — but say so, because a false that vanished would be the
    // dangerous direction.
    attributes["auto-apply"] = autoApply;

    const result = await new TerraformClient(ctx).request(
      `/api/v2/organizations/${encodeURIComponent(organization)}/workspaces`,
      { method: "POST", body: document("workspaces", attributes) },
    );
    const workspace = flatten(result.data as never) ?? {};

    if (autoApply) {
      ctx.log(
        "warn",
        "created a Terraform workspace with AUTO-APPLY on — successful plans will apply themselves",
        { id: workspace.id },
      );
    } else {
      ctx.log("info", "created a Terraform workspace", { id: workspace.id });
    }

    return {
      workspace,
      id: workspace.id,
      name: workspace["name"],
      autoApply: workspace["auto-apply"] === true,
    };
  },
};

export default action;
