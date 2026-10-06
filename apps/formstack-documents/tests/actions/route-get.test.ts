import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/route-get.ts";

Deno.test("route-get: GETs /routes/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "129578", key: "l3kjs" } }]);
  const out = await action.execute({ id: "129578" } as never, ctx) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "GET");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/routes/129578");
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("route-get: declares key, type and a description", () => {
  assertEquals(action.key, "route-get");
  assertEquals(action.type, "read");
  assert(action.description!.length > 10);
});
