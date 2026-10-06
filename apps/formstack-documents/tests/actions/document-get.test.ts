import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/document-get.ts";

Deno.test("document-get: GETs /documents/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "436346", key: "firm3", url: "https://www.webmerge.me/merge/436346/firm3" },
  }]);
  const out = await action.execute({ id: "436346" } as never, ctx) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "GET");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/documents/436346");
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("document-get: declares key, type and a description", () => {
  assertEquals(action.key, "document-get");
  assertEquals(action.type, "read");
  assert(action.description!.length > 10);
});
