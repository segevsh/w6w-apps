import { assertEquals } from "@std/assert";
import action from "../../actions/data-connection-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("data-connection-get: GET /data-connections/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "N" } }]);
  const out = await action.execute({ dataConnectionId: "x1" }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/api/v1/data-connections/x1");
  assertEquals(out.name, "N");
});

Deno.test("data-connection-get: the id cannot escape its path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ dataConnectionId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/data-connections/a%2Fb");
});
