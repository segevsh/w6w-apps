import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/route-update.ts";

Deno.test("route-update: PUTs only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "234543" } }]);
  const out = await action.execute(
    { id: "234543", rules: [{ id: "12345", combine: 0 }] } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "PUT");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/routes/234543");
  assertEquals(JSON.parse(call.body!), { "rules": [{ "id": "12345", "combine": 0 }] });
  assertEquals("name" in JSON.parse(call.body!), false);
  assert(out !== null);
});

Deno.test("route-update: idempotent flag is true", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("route-update: declares key, type and a description", () => {
  assertEquals(action.key, "route-update");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
