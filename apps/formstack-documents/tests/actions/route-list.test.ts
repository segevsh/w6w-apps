import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/route-list.ts";

Deno.test("route-list: GETs /routes", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "129578", key: "l3kjs", name: "Contract" }] }]);
  const out = await action.execute({} as never, ctx) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "GET");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/routes");
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("route-list: declares key, type and a description", () => {
  assertEquals(action.key, "route-list");
  assertEquals(action.type, "read");
  assert(action.description!.length > 10);
});
