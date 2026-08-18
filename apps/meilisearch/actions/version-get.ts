import type { ActionDefinition } from "@w6w/types";
import { MeilisearchClient } from "../lib/client.ts";

/**
 * `GET /version` — verified against Meilisearch's OpenAPI document
 * (`get_version`).
 *
 * Worth having as an action rather than only at connect time: Meilisearch's
 * settings surface changes between minor versions, so "which engine is this
 * instance running" is a real question when a setting a workflow depends on
 * turns out not to exist.
 */
const action: ActionDefinition = {
  key: "version-get",
  type: "read",
  resource: "instance",
  title: "Get the engine version",
  description: "The Meilisearch version this instance is running.",
  params: [],
  output: [
    { key: "pkgVersion", type: "string", label: "Engine version" },
    { key: "commitSha", type: "string", label: "Commit SHA" },
    { key: "commitDate", type: "string", label: "Commit date" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "getting the Meilisearch version", {});
    return await new MeilisearchClient(ctx).request("/version");
  },
};

export default action;
