import type { ActionDefinition } from "@w6w/types";
import { flattenAll, TerraformClient } from "../lib/client.ts";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import { resolveWorkspace } from "../lib/workspaces.ts";

/**
 * `GET /api/v2/workspaces/{id}/vars` — a workspace's variables.
 *
 * ## A sensitive variable's value is gone, not hidden
 *
 * `sensitive: true` makes a variable **write-only**. Every read afterwards
 * returns `"value": null` — including this one, including the web interface,
 * including the run that uses it. There is no call and no permission level
 * that reads it back.
 *
 * That matters most for the shape of a workflow that edits variables:
 * read-all, modify-one, write-all-back **blanks every sensitive variable in
 * the workspace**, because the values it read were nulls and it wrote them
 * faithfully. `variable-set` refuses to be used that way; this action reports
 * `sensitiveCount` so a caller can see what it is missing before trying.
 *
 * ## Two categories, and mixing them up is a silent no-op
 *
 * - **`terraform`** — an input variable the configuration declares. If the
 *   configuration has no `variable "x"` block, setting `x` does nothing at all
 *   and no error is raised.
 * - **`env`** — an environment variable for the run's process. This is where
 *   provider credentials live: `AWS_ACCESS_KEY_ID`, `GOOGLE_CREDENTIALS`,
 *   `ARM_CLIENT_SECRET`.
 *
 * A provider credential set as a `terraform` variable is ignored by the
 * provider and the run fails for lack of credentials while the variable is
 * clearly there in the interface.
 */
const action: ActionDefinition = {
  key: "variable-list",
  type: "read",
  resource: "variable",
  title: "List workspace variables",
  description:
    "A workspace's variables. A SENSITIVE variable's value is unreadable forever — read-modify-" +
    "write across a workspace blanks every one of them.",
  params: [
    ...WORKSPACE_PARAMS,
    {
      key: "category",
      label: "Category",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Both" },
        { value: "terraform", label: "Terraform — input variables" },
        { value: "env", label: "Environment — where provider credentials live" },
      ],
    },
  ],
  output: [
    { key: "variables", type: "array", label: "The variables, sensitive values withheld" },
    { key: "count", type: "number", label: "How many" },
    { key: "keys", type: "array", label: "Just the names" },
    { key: "sensitiveCount", type: "number", label: "How many have unreadable values" },
    { key: "envCount", type: "number", label: "How many are environment variables" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ref = await resolveWorkspace(p, ctx);

    const document = await new TerraformClient(ctx).request(
      `/api/v2/workspaces/${encodeURIComponent(ref.id)}/vars`,
    );
    const all = flattenAll(document.data as never);

    const category = String(p.category ?? "").trim();
    const variables = category ? all.filter((v) => v["category"] === category) : all;

    const sensitiveCount = variables.filter((v) => v["sensitive"] === true).length;

    ctx.log("info", "listed Terraform workspace variables", {
      workspaceId: ref.id,
      count: variables.length,
      sensitiveCount,
    });

    return {
      variables,
      count: variables.length,
      keys: variables.map((v) => v["key"]).filter(Boolean),
      sensitiveCount,
      envCount: variables.filter((v) => v["category"] === "env").length,
    };
  },
};

export default action;
