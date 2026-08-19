import type { ActionDefinition } from "@w6w/types";
import { document, emptyToUndefined, flatten, TerraformClient } from "../lib/client.ts";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import { resolveWorkspace } from "../lib/workspaces.ts";

/**
 * `PATCH /api/v2/workspaces/{id}` — change a workspace's settings.
 *
 * ## An unrecognised attribute is ignored, not rejected
 *
 * This is the trap this action exists to avoid. Attribute names are
 * **kebab-case** — `auto-apply`, `terraform-version`, `execution-mode`. A
 * PATCH sending `auto_apply` returns **200 with the workspace unchanged**: the
 * server ignores what it does not recognise rather than answering 422. The
 * call succeeded, the setting did not change, and nothing says so.
 *
 * So this action builds the document from named parameters, and verifies
 * afterwards that what it asked for is what came back — reporting `changed`
 * rather than assuming.
 *
 * ## Turning on auto-apply is a different kind of change
 *
 * It converts every future successful plan into an infrastructure change with
 * no confirmation. It is gated behind an acknowledgement here for that reason,
 * and turning it *off* is not.
 */
const action: ActionDefinition = {
  key: "workspace-update",
  type: "perform",
  resource: "workspace",
  title: "Update a workspace",
  description:
    "Change a workspace's settings, and report what actually changed — the API IGNORES an " +
    "attribute it does not recognise and returns 200, so a silent no-op looks like success.",
  idempotent: true,
  params: [
    ...WORKSPACE_PARAMS,
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
    },
    {
      key: "autoApply",
      label: "Auto-apply",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "On — successful plans apply themselves" },
        { value: "false", label: "Off — an apply must be confirmed" },
      ],
    },
    {
      key: "confirmAutoApply",
      label: "I understand what auto-apply does",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "autoApply" }, "true"] },
      hint: "Required to turn it ON. Every successful plan afterwards changes infrastructure " +
        "with no confirmation step.",
    },
    {
      key: "executionMode",
      label: "Execution Mode",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "remote", label: "Remote" },
        { value: "local", label: "Local" },
        { value: "agent", label: "Agent" },
      ],
    },
    {
      key: "workingDirectory",
      label: "Working Directory",
      type: "string",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "workspace", type: "object", label: "The workspace as it now stands" },
    { key: "id", type: "string", label: "Its id" },
    { key: "changed", type: "array", label: "The attributes that actually changed" },
    { key: "unchanged", type: "boolean", label: "True when the PATCH did nothing" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ref = await resolveWorkspace(p, ctx);

    const autoApply = String(p.autoApply ?? "").trim();
    if (autoApply === "true" && p.confirmAutoApply !== true) {
      throw new Error(
        "set `confirmAutoApply` — turning auto-apply on makes every future successful plan " +
          "change infrastructure with no confirmation step",
      );
    }

    const attributes = emptyToUndefined({
      "description": p.description,
      "terraform-version": p.terraformVersion,
      "auto-apply": autoApply === "" ? undefined : autoApply === "true",
      "execution-mode": p.executionMode,
      "working-directory": p.workingDirectory,
    });
    if (!attributes) {
      throw new Error("nothing to change — give at least one setting");
    }

    const result = await new TerraformClient(ctx).request(
      `/api/v2/workspaces/${encodeURIComponent(ref.id)}`,
      { method: "PATCH", body: document("workspaces", attributes) },
    );
    const workspace = flatten(result.data as never) ?? {};

    // The server accepts and ignores what it does not recognise, so "it
    // returned 200" is not evidence the setting moved.
    const changed = Object.keys(attributes).filter((key) => workspace[key] === attributes[key]);
    const ignored = Object.keys(attributes).filter((key) => !changed.includes(key));
    if (ignored.length) {
      ctx.log("warn", "Terraform did not apply every requested attribute", { ignored });
    }
    if (autoApply === "true" && workspace["auto-apply"] === true) {
      ctx.log("warn", "auto-apply is now ON for this workspace", { id: ref.id });
    }

    return {
      workspace,
      id: ref.id,
      changed,
      unchanged: changed.length === 0,
    };
  },
};

export default action;
