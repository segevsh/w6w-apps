import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/route-delete.ts";

Deno.test("route-delete: DELETEs /routes/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: "1" } }]);
  const out = await action.execute({ id: "129578" } as never, ctx) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "DELETE");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/routes/129578");
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("route-delete: idempotent flag is true", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("route-delete: declares key, type and a description", () => {
  assertEquals(action.key, "route-delete");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
