import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/route-rules-get.ts";

test("route-rules-get: GETs /routes/{id}/rules", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "12345", document_id: "1234567", combine: 0 }] }]);
  const out = await action.execute({ id: "12345" } as never, ctx) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "GET");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/routes/12345/rules");
  assertEquals(call.body, null);
  assert(out !== null);
});

test("route-rules-get: declares key, type and a description", () => {
  assertEquals(action.key, "route-rules-get");
  assertEquals(action.type, "read");
  assert(action.description!.length > 10);
});
