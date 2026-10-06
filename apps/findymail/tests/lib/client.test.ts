import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  compact,
  errorText,
  FindymailClient,
  intList,
  jsonValue,
  seg,
  strList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: strList splits, trims and drops empties", () => {
  assertEquals(strList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(strList(["x", " y "]), ["x", "y"]);
  assertEquals(strList(" , "), undefined);
  assertEquals(strList(undefined), undefined);
});

Deno.test("client: intList parses integers and rejects the rest", () => {
  assertEquals(intList("1, 2", "IDs"), [1, 2]);
  assertEquals(intList(undefined, "IDs"), undefined);
  try {
    intList("1,x", "IDs");
    throw new Error("should have thrown");
  } catch (e) {
    assert((e as Error).message.includes("whole numbers"));
  }
});

Deno.test("client: jsonValue parses JSON text and passes other text through", () => {
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("not json"), "not json");
  assertEquals(jsonValue(" "), undefined);
  assertEquals(jsonValue({ a: 1 }), { a: 1 });
});

Deno.test("client: compact drops undefined only; buildQuery skips unset", () => {
  assertEquals(compact({ a: 1, b: undefined, c: false, d: null }), { a: 1, c: false, d: null });
  assertEquals(buildQuery({ a: "1", b: undefined, c: "", d: 0 }), "?a=1&d=0");
  assertEquals(buildQuery({}), "");
  assertEquals(seg("a/b"), "a%2Fb");
});

Deno.test("client: errorText covers error, message and validation shapes", () => {
  assertEquals(errorText({ error: "Not enough credits" }), "Not enough credits");
  assertEquals(errorText({ message: "Unauthenticated." }), "Unauthenticated.");
  assertEquals(
    errorText({ message: "invalid", errors: { name: ["taken", "short"] } }),
    "invalid — name: taken short",
  );
  assertEquals(errorText(null, "  plain  "), "plain");
});

Deno.test("client: sends accept JSON, a JSON body with content-type, and no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  const out = await new FindymailClient(ctx).request("POST", "/api/x", { body: { a: 1 } });
  assertEquals(out, { ok: 1 });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: an empty success body becomes {} and a failure carries status and text", async () => {
  const ok = mockCtx([{ status: 204 }]);
  assertEquals(await new FindymailClient(ok.ctx).request("DELETE", "/api/x"), {});
  const bad = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const err = await assertRejects(() => new FindymailClient(bad.ctx).request("GET", "/api/x"));
  assert((err as Error).message.includes("HTTP 502"));
  assert((err as Error).message.includes("bad gateway"));
});
