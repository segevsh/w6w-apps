import type { ActionDefinition } from "@w6w/types";
import { flattenAll, TerraformClient } from "../lib/client.ts";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import { resolveWorkspace } from "../lib/workspaces.ts";

/**
 * `DELETE /api/v2/workspaces/{id}/vars/{var_id}` — remove a variable.
 *
 * ## Removing a variable does not remove its effect until the next run
 *
 * The variable disappears immediately. The infrastructure built with it keeps
 * running exactly as it was, because state describes what exists rather than
 * what the configuration said. The change appears at the **next plan**, which
 * may be days later and triggered by somebody else, and which will show
 * differences nobody in that conversation caused.
 *
 * ## Deleting a sensitive variable is irreversible in the strong sense
 *
 * Its value could not be read while it existed, so there is no copy to restore
 * from unless somebody kept one elsewhere. Deleting an `env` credential is
 * how a workspace stops being able to authenticate to its provider at all, and
 * recovering means going back to the source of the credential.
 *
 * This action therefore resolves the variable by name, reports what it was
 * (its category and whether it was sensitive), and requires the name typed
 * back when it is.
 */
const action: ActionDefinition = {
  key: "variable-delete",
  type: "perform",
  resource: "variable",
  title: "Delete a workspace variable",
  description:
    "Remove a variable. The effect only appears at the NEXT plan, and a deleted sensitive value " +
    "cannot be recovered — nothing could read it while it existed.",
  idempotent: true,
  params: [
    ...WORKSPACE_PARAMS,
    {
      key: "key",
      label: "Name",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      required: true,
      default: "terraform",
      options: [
        { value: "terraform", label: "Terraform" },
        { value: "env", label: "Environment" },
      ],
      hint: "The same name can exist in both, so this decides which one goes.",
    },
    {
      key: "confirmKey",
      label: "Type the variable name again",
      type: "string",
      default: "",
      hint:
        "Required for a sensitive variable — its value cannot be read, so there is nothing to " +
        "restore from.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed" },
    { key: "key", type: "string", label: "What was removed" },
    { key: "category", type: "string", label: "Which category it was in" },
    { key: "wasSensitive", type: "boolean", label: "Whether its value was unrecoverable" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const key = String(p.key ?? "").trim();
    if (!key) throw new Error("`key` is required");
    const category = String(p.category ?? "terraform");

    const ref = await resolveWorkspace(p, ctx);
    const client = new TerraformClient(ctx);

    const document = await client.request(
      `/api/v2/workspaces/${encodeURIComponent(ref.id)}/vars`,
    );
    const existing = flattenAll(document.data as never).find((entry) =>
      entry["key"] === key && entry["category"] === category
    );
    if (!existing) {
      throw new Error(
        `no \`${category}\` variable named "${key}" on this workspace — the same name can exist ` +
          "in both categories, so check which one was meant",
      );
    }

    const wasSensitive = existing["sensitive"] === true;
    if (wasSensitive && String(p.confirmKey ?? "").trim() !== key) {
      throw new Error(
        `"${key}" is sensitive: set \`confirmKey\` to its name to delete it. Its value could ` +
          "never be read, so there is no copy anywhere to restore from",
      );
    }

    await client.request(
      `/api/v2/workspaces/${encodeURIComponent(ref.id)}/vars/${
        encodeURIComponent(String(existing.id))
      }`,
      { method: "DELETE" },
    );

    ctx.log(
      wasSensitive ? "warn" : "info",
      wasSensitive
        ? "deleted a SENSITIVE Terraform variable — its value cannot be recovered"
        : "deleted a Terraform variable",
      { workspaceId: ref.id, key, category },
    );

    return { deleted: true, key, category, wasSensitive };
  },
};

export default action;
