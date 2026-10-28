import type { ActionDefinition } from "@w6w/types";
import { compact, ConfluenceClient } from "../lib/client.ts";

/**
 * `POST /wiki/api/v2/spaces` — verified against Confluence Cloud's REST API v2
 * OpenAPI document (`createSpace`; body requires `name`).
 *
 * The space `description` is a `{value, representation}` object rather than a
 * string, and Confluence's schema notes that "only the 'plain' representation
 * is currently supported" — so that is what this sends.
 */
const action: ActionDefinition = {
  key: "space-create",
  type: "perform",
  resource: "space",
  title: "Create a space",
  description: "Create a new space, optionally private.",
  // A duplicate key is rejected rather than deduped, and a second call with no
  // key makes a second space.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    {
      key: "key",
      label: "Space Key",
      type: "string",
      default: "",
      placeholder: "ENG",
      hint: "Uppercase short code. Confluence derives one when blank.",
    },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "createPrivateSpace",
      label: "Private",
      type: "boolean",
      default: false,
      hint: "Only the creator can see the space until they grant access.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Space ID" },
    { key: "key", type: "string", label: "Space key" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "status", type: "string", label: "Status" },
    { key: "homepageId", type: "string", label: "Homepage ID" },
    { key: "_links", type: "object", label: "Links" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const description = String(p.description ?? "").trim();
    const body = compact({
      name,
      key: p.key,
      // A flat `{value, representation}` object, per the schema — and its own
      // note that "only the 'plain' representation is currently supported".
      description: description ? { value: description, representation: "plain" } : undefined,
      createPrivateSpace: p.createPrivateSpace === true ? true : undefined,
    });

    const client = new ConfluenceClient(ctx);
    ctx.log("info", "creating Confluence space", { name });

    return await client.request("/spaces", { method: "POST", body });
  },
};

export default action;
