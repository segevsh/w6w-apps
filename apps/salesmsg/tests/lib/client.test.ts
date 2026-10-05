import { assert, assertEquals } from "@std/assert";
import {
  asStringArray,
  compact,
  encodePathSegment,
  formatSalesmsgError,
  isCredentialRefusal,
  SalesmsgClient,
} from "../../lib/client.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

Deno.test("client: items() normalises an array, {data}, {results}, and keeps meta", async () => {
  const { ctx } = mockCtx([
    { body: [{ id: 1 }] },
    { body: { data: [{ id: 2 }], meta: { total: 1 } } },
    { body: { results: [{ id: 3 }] } },
  ]);
  const c = new SalesmsgClient(ctx);
  assertEquals(await c.items("/a"), { items: [{ id: 1 }] });
  assertEquals(await c.items("/b"), { items: [{ id: 2 }], meta: { total: 1 } });
  assertEquals(await c.items("/c"), { items: [{ id: 3 }] });
});

Deno.test("client: an unrecognised collection shape is kept whole under meta", async () => {
  const { ctx } = mockCtx([{ body: { numbers: [1] } }]);
  assertEquals(await new SalesmsgClient(ctx).items("/x"), { items: [], meta: { numbers: [1] } });
});

Deno.test("client: array query values repeat the key", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SalesmsgClient(ctx).json("/x", { query: { "a[]": ["1", "2"], skip: "", b: false } });
  assertEquals(new URL(calls[0].url).searchParams.getAll("a[]"), ["1", "2"]);
  assertEquals(queryOf(calls[0].url).b, "false");
  assertEquals(new URL(calls[0].url).searchParams.has("skip"), false);
});

Deno.test("client: an error carries the status, the vendor message and advice", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { message: "Too Many Attempts." } }]);
  try {
    await new SalesmsgClient(ctx).json("/teams");
    throw new Error("expected a failure");
  } catch (err) {
    const m = (err as Error).message;
    assert(m.includes("429") && m.includes("Too Many Attempts.") && m.includes("60 requests"), m);
  }
});

Deno.test("client: a 404 and a non-JSON body are both readable", () => {
  assert(formatSalesmsgError(404, "GET", "/x", '{"message":"Not Found"}').includes("check the ID"));
  assert(formatSalesmsgError(502, "GET", "/x", "<html>bad gateway</html>").includes("bad gateway"));
});

Deno.test("client: credential refusal is read from the body, with 401 as the fallback", () => {
  assertEquals(isCredentialRefusal(403, { message: "Could not decode token: x" }), true);
  assertEquals(isCredentialRefusal(401, {}), true);
  assertEquals(isCredentialRefusal(500, { message: null }), false);
  assertEquals(isCredentialRefusal(403, { message: "This action is forbidden" }), false);
});

Deno.test("client: small helpers", () => {
  assertEquals(compact({ a: 0, b: false, c: "", d: null, e: undefined, f: "x" }), {
    a: 0,
    b: false,
    f: "x",
  });
  assertEquals(encodePathSegment(" 4/2 "), "4%2F2");
  assertEquals(asStringArray("a, b,,c"), ["a", "b", "c"]);
  assertEquals(asStringArray(""), undefined);
});
