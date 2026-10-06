import { assertEquals } from "@std/assert";
import action from "../../actions/model-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("model-list: GETs /v1/models and opts out of auth", async () => {
  const body = { data: [{ id: "gladia/solaria-1", is_ready: true }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await action.execute({}, ctx), body);
  assertEquals(calls[0].url, "https://api.gladia.io/v1/models");
  assertEquals(calls[0].method, "GET");
  assertEquals(action.requiresAuth, false);
});
