import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-file-versions.ts";

Deno.test("get-file-versions: GETs /v1/files/{key}/versions", async () => {
  const { ctx, calls } = mockCtx([{ body: { versions: [], pagination: {} } }]);
  await action.execute({ fileKey: "abc123" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/files/abc123/versions");
  assertEquals(calls[0].method, "GET");
});
