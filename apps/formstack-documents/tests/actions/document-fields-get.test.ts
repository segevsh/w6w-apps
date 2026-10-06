import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/document-fields-get.ts";

Deno.test("document-fields-get: GETs fields with attributes=1", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ key: "a", name: "FirstName" }] }]);
  const out = await action.execute({ id: "436346", attributes: true } as never, ctx) as Record<
    string,
    unknown
  >;
  const call = calls[0];
  assertEquals(call.method, "GET");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/documents/436346/fields");
  assertEquals(url.searchParams.get("attributes"), "1");
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("document-fields-get: omits attributes when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await action.execute({ id: "436346" } as never, ctx) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "GET");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/documents/436346/fields");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("document-fields-get: declares key, type and a description", () => {
  assertEquals(action.key, "document-fields-get");
  assertEquals(action.type, "read");
  assert(action.description!.length > 10);
});
