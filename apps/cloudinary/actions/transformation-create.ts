import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";

/**
 * `POST /transformations/{name}` — define a named transformation.
 *
 * A named transformation is an indirection worth having: a URL says
 * `t_product_thumb` instead of `w_400,h_400,c_fill,g_auto,q_auto,f_auto`, and
 * changing the definition changes every page that uses it without redeploying
 * anything. That is the "plug and play" case for media — the size of a product
 * thumbnail becomes a setting rather than a string baked into a template.
 *
 * The catch is the same as its benefit: **editing a named transformation
 * invalidates every derived asset built from it**, so the next request for each
 * one pays to regenerate. Changing a widely-used definition is therefore a
 * measurable event, not a free edit.
 *
 * `allowed_for_strict` matters if the account has strict transformations on:
 * without it, delivery URLs using this transformation are rejected.
 */
const action: ActionDefinition = {
  key: "transformation-create",
  type: "perform",
  resource: "transformation",
  title: "Create named transformation",
  description:
    "Define `t_name` once and reference it from every URL — so changing the size of a thumbnail " +
    "is a setting rather than a redeploy.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      placeholder: "product_thumb",
      hint: "Referenced in a URL as `t_<name>`.",
    },
    {
      key: "transformation",
      label: "Transformation",
      type: "string",
      required: true,
      default: "",
      placeholder: "w_400,h_400,c_fill,g_auto,q_auto,f_auto",
      hint: "Cloudinary's transformation syntax. Chain steps with `/`.",
    },
    {
      key: "allowedForStrict",
      label: "Allowed For Strict",
      type: "boolean",
      default: false,
      hint: "Needed if the account restricts delivery to approved transformations — without it " +
        "URLs using this one are rejected.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const transformation = String(p.transformation ?? "").trim();
    if (!transformation) throw new Error("`transformation` is required");

    return await new CloudinaryClient(ctx).request(
      `/transformations/${encodeURIComponent(name)}`,
      {
        method: "POST",
        form: true,
        body: {
          transformation,
          ...(p.allowedForStrict === true ? { allowed_for_strict: true } : {}),
        },
      },
    );
  },
};

export default action;
