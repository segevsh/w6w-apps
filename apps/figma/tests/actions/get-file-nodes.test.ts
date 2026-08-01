import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-file-nodes.ts";

Deno.test("get-file-nodes: GETs /v1/files/{key}/nodes with required ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { nodes: {} } }]);
  await action.execute({ fileKey: "abc123", ids: "1:2,1:3" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/files/abc123/nodes");
  assertEquals(url.searchParams.get("ids"), "1:2,1:3");
});

Deno.test("get-file-nodes: forwards optional depth/version/geometry", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ fileKey: "abc123", ids: "1:2", version: "v1", depth: 1 }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("version"), "v1");
  assertEquals(params.get("depth"), "1");
});
