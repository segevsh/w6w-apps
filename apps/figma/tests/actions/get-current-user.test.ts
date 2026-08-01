import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-current-user.ts";

Deno.test("get-current-user: GETs /v1/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", handle: "segev" } }]);
  const result = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/me");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: "u1", handle: "segev" });
});
