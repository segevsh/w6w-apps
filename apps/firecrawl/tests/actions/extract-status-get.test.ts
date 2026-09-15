import { assertEquals } from "@std/assert";
import extractStatusGet from "../../actions/extract-status-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("extract-status-get: GETs /extract/{id} and returns the body verbatim", async () => {
  const statusBody = {
    success: true,
    status: "completed",
    data: { title: "Example" },
    tokensUsed: 42,
  };
  const { ctx, calls } = mockCtx([{ status: 200, body: statusBody }]);
  const out = await extractStatusGet.execute({ id: "e1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/extract/e1");
  assertEquals(out, statusBody);
});

Deno.test("extract-status-get: is a read", () => {
  assertEquals(extractStatusGet.type, "read");
});
