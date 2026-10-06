import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/route-delivery-list.ts";

Deno.test("route-delivery-list: GETs /routes/{id}/deliveries", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "261", type: "email" }] }]);
  const out = await action.execute({ id: "12345" } as never, ctx) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "GET");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/routes/12345/deliveries");
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("route-delivery-list: declares key, type and a description", () => {
  assertEquals(action.key, "route-delivery-list");
  assertEquals(action.type, "read");
  assert(action.description!.length > 10);
});
