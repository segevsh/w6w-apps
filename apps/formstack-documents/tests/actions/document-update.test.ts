import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/document-update.ts";

Deno.test("document-update: PUTs only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "234543" } }]);
  const out = await action.execute(
    { id: "234543", name: "1040 EZier", outputName: "1040 for {$FirstName}" } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "PUT");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/documents/234543");
  assertEquals(JSON.parse(call.body!), {
    "name": "1040 EZier",
    "output_name": "1040 for {$FirstName}",
  });
  assertEquals("output" in JSON.parse(call.body!), false);
  assertEquals("html" in JSON.parse(call.body!), false);
  assert(out !== null);
});

Deno.test("document-update: idempotent flag is true", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("document-update: declares key, type and a description", () => {
  assertEquals(action.key, "document-update");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
