import type { ActionDefinition } from "@w6w/types";
import { compact, document, flatten, flattenAll, TerraformClient } from "../lib/client.ts";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import { resolveWorkspace } from "../lib/workspaces.ts";

/**
 * `POST` or `PATCH /api/v2/workspaces/{id}/vars` — set a variable, creating it
 * if it is not there.
 *
 * ## Upsert, because the API does not offer one
 *
 * Creating a variable that exists is a 422; updating one that does not needs
 * an id nobody has. Every caller therefore writes the same list-then-branch,
 * so this action does it: it lists, matches on **key and category together**
 * (the same name can exist once as `terraform` and once as `env`), and picks
 * POST or PATCH.
 *
 * ## Marking a variable sensitive is one-way
 *
 * Once `sensitive: true`, the value can never be read back — not by this API,
 * not by the web interface, not by anything. Clearing the flag does not
 * restore the old value's readability; it applies from the next write.
 *
 * So this action refuses to update an existing sensitive variable without an
 * explicit new value: the alternative is writing back the `null` a read
 * returned, which silently empties a credential the runs depend on.
 *
 * ## `env` is where provider credentials go
 *
 * A `terraform` variable is only meaningful if the configuration declares
 * `variable "x"`; if it does not, setting it does nothing and says nothing. A
 * provider credential set as `terraform` is ignored by the provider, and the
 * run fails for missing credentials while the variable sits there in plain
 * view.
 *
 * ## `hcl` changes how the value is read
 *
 * With `hcl: true` the value is parsed as an HCL expression, so `["a","b"]` is
 * a list. Without it, that is the eleven-character string `["a","b"]`, and the
 * type error surfaces during the plan rather than here.
 */
const action: ActionDefinition = {
  key: "variable-set",
  type: "perform",
  resource: "variable",
  title: "Set a workspace variable",
  description:
    "Create or update a variable. Marking one SENSITIVE is one-way — its value can never be read " +
    "back — so updating a sensitive variable requires an explicit new value.",
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
      key: "value",
      label: "Value",
      type: "string",
      default: "",
      hint: "Required when creating, and when updating a sensitive variable.",
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      required: true,
      default: "terraform",
      options: [
        { value: "terraform", label: "Terraform — an input the configuration declares" },
        { value: "env", label: "Environment — where provider credentials go" },
      ],
      hint: "A `terraform` variable the configuration does not declare is IGNORED silently. " +
        "Provider credentials must be `env`.",
    },
    {
      key: "sensitive",
      label: "Sensitive",
      type: "boolean",
      default: false,
      hint: "One-way: the value becomes unreadable to everything, permanently.",
    },
    {
      key: "hcl",
      label: "Parse as HCL",
      type: "boolean",
      default: false,
      advanced: true,
      hint: 'Off, `["a","b"]` is a STRING containing brackets, and the type error appears during ' +
        "the plan.",
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "variable", type: "object", label: "The variable, value withheld if sensitive" },
    { key: "id", type: "string", label: "Its id" },
    { key: "key", type: "string", label: "Its name" },
    { key: "created", type: "boolean", label: "Whether it was created rather than updated" },
    { key: "sensitive", type: "boolean", label: "Whether the value is now unreadable" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const key = String(p.key ?? "").trim();
    if (!key) throw new Error("`key` is required");
    const category = String(p.category ?? "terraform");
    const sensitive = p.sensitive === true;
    const hasValue = p.value !== undefined && p.value !== null && String(p.value) !== "";

    const ref = await resolveWorkspace(p, ctx);
    const client = new TerraformClient(ctx);

    const existingDocument = await client.request(
      `/api/v2/workspaces/${encodeURIComponent(ref.id)}/vars`,
    );
    // The same name can exist once per category, so both must match.
    const existing = flattenAll(existingDocument.data as never).find((entry) =>
      entry["key"] === key && entry["category"] === category
    );

    if (!existing && !hasValue) {
      throw new Error(`\`value\` is required to create the variable "${key}"`);
    }
    if (existing && existing["sensitive"] === true && !hasValue) {
      throw new Error(
        `"${key}" is sensitive, and its value cannot be read back by anything. Updating it ` +
          "without a `value` would write an empty string over a credential the runs depend on — " +
          "give the value explicitly, or leave the variable alone",
      );
    }

    const attributes = compact({
      key,
      value: hasValue ? String(p.value) : undefined,
      category,
      description: p.description,
    });
    attributes.sensitive = sensitive;
    attributes.hcl = p.hcl === true;

    const result = existing
      ? await client.request(
        `/api/v2/workspaces/${encodeURIComponent(ref.id)}/vars/${
          encodeURIComponent(String(existing.id))
        }`,
        { method: "PATCH", body: document("vars", attributes) },
      )
      : await client.request(`/api/v2/workspaces/${encodeURIComponent(ref.id)}/vars`, {
        method: "POST",
        body: document("vars", attributes),
      });

    const variable = flatten(result.data as never) ?? {};

    // The key and the flags. Never the value — that is the point of `env`.
    ctx.log("info", existing ? "updated a Terraform variable" : "created a Terraform variable", {
      workspaceId: ref.id,
      key,
      category,
      sensitive,
    });

    return {
      variable,
      id: variable.id,
      key: variable["key"] ?? key,
      created: !existing,
      sensitive: variable["sensitive"] === true,
    };
  },
};

export default action;
