import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/document-copy.ts";

Deno.test("document-copy: POSTs the new name to /documents/{id}/copy", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "789789", key: "asdl4k" } }]);
  const out = await action.execute(
    { id: "436346", name: "1040 EZier - CA" } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/documents/436346/copy");
  assertEquals(JSON.parse(call.body!), { "name": "1040 EZier - CA" });
  assert(out !== null);
});

Deno.test("document-copy: idempotent flag is false", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("document-copy: declares key, type and a description", () => {
  assertEquals(action.key, "document-copy");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
