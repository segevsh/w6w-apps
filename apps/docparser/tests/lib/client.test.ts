import { assert, assertEquals } from "@std/assert";
import {
  compact,
  DocparserClient,
  encodeId,
  formatError,
  pageOf,
  toList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: toList splits commas and newlines and drops blanks", () => {
  assertEquals(toList("a, b\nc,,"), ["a", "b", "c"]);
  assertEquals(toList(undefined), []);
  assertEquals(toList([" x "]), ["x"]);
});

Deno.test("client: compact/encodeId/pageOf", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: null }), { a: 1 });
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(pageOf(null), { items: [], count: 0 });
});

Deno.test("client: formatError reads {error} and falls back to the raw body", () => {
  assertEquals(
    formatError(403, "GET", "/v1/x", '{"error":"nope"}'),
    "Docparser 403 for GET /v1/x: nope",
  );
  assertEquals(formatError(502, "GET", "/v1/x", "<html>"), "Docparser 502 for GET /v1/x: <html>");
});

Deno.test("client: a non-JSON 200 throws instead of returning garbage", async () => {
  const { ctx } = mockCtx([{ body: "<html>spa</html>" }]);
  const err = await new DocparserClient(ctx).json("/v1/parsers").catch((e) => e as Error) as Error;
  assert(err.message.includes("non-JSON"));
});
