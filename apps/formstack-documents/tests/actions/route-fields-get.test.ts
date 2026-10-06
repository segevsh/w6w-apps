import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/route-fields-get.ts";

Deno.test("route-fields-get: GETs /routes/{id}/fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ key: "a", name: "FirstName" }] }]);
  const out = await action.execute({ id: "129578" } as never, ctx) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "GET");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/routes/129578/fields");
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("route-fields-get: declares key, type and a description", () => {
  assertEquals(action.key, "route-fields-get");
  assertEquals(action.type, "read");
  assert(action.description!.length > 10);
});
