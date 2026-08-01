import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-file.ts";

Deno.test("get-file: GETs /v1/files/{key}", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "My File" } }]);
  await action.execute({ fileKey: "abc123" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/files/abc123");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-file: forwards optional query params using Figma's snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    fileKey: "abc123",
    version: "v1",
    ids: "1:2,1:3",
    depth: 2,
    geometry: "paths",
    pluginData: "shared",
    branchData: true,
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("version"), "v1");
  assertEquals(params.get("ids"), "1:2,1:3");
  assertEquals(params.get("depth"), "2");
  assertEquals(params.get("geometry"), "paths");
  assertEquals(params.get("plugin_data"), "shared");
  assertEquals(params.get("branch_data"), "true");
});
