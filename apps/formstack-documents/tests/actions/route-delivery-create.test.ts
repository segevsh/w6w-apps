import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/route-delivery-create.ts";

Deno.test("route-delivery-create: POSTs type and settings", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "2344", type: "webhook" }] }]);
  const out = await action.execute(
    { id: "12345", type: "webhook", settings: { url: "https://example.com/hook" } } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/routes/12345/deliveries");
  assertEquals(JSON.parse(call.body!), {
    "type": "webhook",
    "settings": { "url": "https://example.com/hook" },
  });
  assert(out !== null);
});

Deno.test("route-delivery-create: idempotent flag is false", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("route-delivery-create: declares key, type and a description", () => {
  assertEquals(action.key, "route-delivery-create");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
