import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/document-delete.ts";

Deno.test("document-delete: DELETEs /documents/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: "1" } }]);
  const out = await action.execute({ id: "436346" } as never, ctx) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "DELETE");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/documents/436346");
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("document-delete: idempotent flag is true", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("document-delete: declares key, type and a description", () => {
  assertEquals(action.key, "document-delete");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
