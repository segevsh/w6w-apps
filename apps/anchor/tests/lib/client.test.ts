import { assert, assertEquals } from "@std/assert";
import {
  AnchorClient,
  asJson,
  buildQuery,
  compact,
  encodeId,
  errorCode,
  toList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("buildQuery: drops empties, joins arrays with commas, encodes values", () => {
  assertEquals(
    buildQuery({ a: "x y", b: "", c: undefined, d: ["p", "q"], e: false, f: 0 }),
    "?a=x%20y&d=p%2Cq&e=false&f=0",
  );
  assertEquals(buildQuery({}), "");
});

Deno.test("errorCode: reads json {error}, nested {error:{message}}, and plain text", () => {
  assertEquals(errorCode({ status: 401, error: "INVALID_API_KEY" }), "INVALID_API_KEY");
  assertEquals(errorCode({ error: { message: "nested" } }), "nested");
  assertEquals(errorCode("Unauthorized"), "Unauthorized");
  assertEquals(errorCode(undefined), undefined);
});

Deno.test("helpers: compact, toList, encodeId, asJson", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: false }), { a: 1, e: false });
  assertEquals(toList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(asJson('{"x":1}', "f"), { x: 1 });
  assertEquals(asJson({ x: 1 }, "f"), { x: 1 });
});

Deno.test("client: empty 200 -> {ok:true}; bare string -> wrapped; object passes through", async () => {
  const c = (r: Parameters<typeof mockCtx>[0]) => new AnchorClient(mockCtx(r).ctx);
  assertEquals(await c([{ status: 200 }]).request("POST", "/x"), { ok: true });
  assertEquals(await c([{ body: '"id1"' }]).request("POST", "/x", { wrap: "id" }), { id: "id1" });
  assertEquals(await c([{ body: { a: 1 } }]).request("GET", "/x"), { a: 1 });
});

Deno.test("client: sends JSON content-type only when there is a body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new AnchorClient(ctx);
  await client.request("GET", "/x");
  await client.request("POST", "/x", { body: { a: 1 } });
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[1].headers["content-type"], "application/json");
  assert(calls[1].body === '{"a":1}');
});
