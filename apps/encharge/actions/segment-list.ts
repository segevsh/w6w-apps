import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient } from "../lib/client.ts";

/**
 * List Segments — `GET /v1/segments`. Verified against the OpenAPI document (`GetSegments`,
 * "Get all dynamic Segments in your account"), fetched 2026-10-06. Not paginated.
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const segmentList: ActionDefinition<Input> = {
  key: "segment-list",
  type: "read",
  resource: "segments",
  title: "List Segments",
  description: "List every dynamic segment in the account, with its id, name and conditions.",
  params: [],
  output: [{ key: "segments", type: "array", label: "The segments (id, name, conditions, color)" }],

  async execute(_input, ctx) {
    return await new EnchargeClient(ctx).request("GET", "/segments");
  },
};

export default segmentList;
