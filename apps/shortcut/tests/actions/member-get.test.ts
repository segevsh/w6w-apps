import { assertEquals } from "@std/assert";
import memberGet from "../../actions/member-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("member-get: calls GET /member and returns the body directly", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", name: "Ada" } }]);
  const out = await memberGet.execute({}, ctx) as { name: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/member");
  assertEquals(out.name, "Ada");
});
