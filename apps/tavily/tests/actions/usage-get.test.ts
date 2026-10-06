import { assertEquals } from "@std/assert";
import usageGet from "../../actions/usage-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("usage-get: GET /usage returns the body as-is", async () => {
  const body = { key: { usage: 1, limit: null }, account: { current_plan: "Free" } };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await usageGet.execute({}, ctx), body);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/usage");
  assertEquals(calls[0].body, null);
});
