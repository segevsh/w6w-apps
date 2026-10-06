import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  buildQuery,
  ClockodoClient,
  compact,
  intId,
  messageOf,
  optInt,
  pagingQuery,
  parseJson,
  reqString,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("buildQuery: scalars, deepObject, arrays; empty values dropped", () => {
  assertEquals(buildQuery({}), "");
  assertEquals(
    buildQuery({
      a: 1,
      b: "",
      c: undefined,
      d: null,
      f: { x: 2, y: undefined },
      g: [1, 2],
      h: false,
    }),
    "a=1&f%5Bx%5D=2&g%5B%5D=1&g%5B%5D=2&h=false",
  );
});

Deno.test("call: GET carries no body; POST sends JSON with a content-type", async () => {
  const get = mockCtx([{ body: { ok: 1 } }]);
  await new ClockodoClient(get.ctx).call("/v3/customers", { query: { page: 2 } });
  assertEquals(get.calls[0].method, "GET");
  assertEquals(get.calls[0].url, "https://my.clockodo.com/api/v3/customers?page=2");
  assertEquals(get.calls[0].body, null);
  assertEquals(get.calls[0].headers["x-clockodoapikey"], undefined);
  const post = mockCtx([{ body: {} }]);
  await new ClockodoClient(post.ctx).call("/v2/clock", { body: { a: 1 } });
  assertEquals(post.calls[0].method, "POST");
  assertEquals(post.calls[0].headers["content-type"], "application/json");
  assertEquals(post.calls[0].body, '{"a":1}');
});

Deno.test("call: both error envelopes and non-JSON bodies are reported with status and message", async () => {
  const a = mockCtx([{
    status: 401,
    body: { errors: [{ type: "General", message: "Authentication failed" }] },
  }]);
  const e1 = await assertRejects(() => new ClockodoClient(a.ctx).call("/v4/users/me"));
  assert(String(e1).includes("401") && String(e1).includes("Authentication failed"));
  const b = mockCtx([{ status: 400, body: { error: { message: "simple" } } }]);
  assert(
    String(await assertRejects(() => new ClockodoClient(b.ctx).call("/x"))).includes("simple"),
  );
  const c = mockCtx([{ status: 200, body: "<html>challenge</html>" }]);
  assert(
    String(await assertRejects(() => new ClockodoClient(c.ctx).call("/x"))).includes("challenge"),
  );
});

Deno.test("messageOf: errors array, path suffix, string error, null", () => {
  assertEquals(
    messageOf({ errors: [{ message: "m", path: "time_since" }, { type: "T" }] }),
    "m (time_since); T",
  );
  assertEquals(messageOf({ error: "plain" }), "plain");
  assertEquals(messageOf({ error: { code: 1 } }), '{"code":1}');
  assertEquals(messageOf(null), undefined);
  assertEquals(messageOf({}), undefined);
});

Deno.test("helpers: ids, optional ints, strings, json, compact, paging", () => {
  assertEquals(intId("12", "id"), 12);
  assertThrows(() => intId("1.5", "id"), Error, "positive integer");
  assertThrows(() => intId(0, "id"), Error, "positive integer");
  assertEquals(optInt(undefined, "x"), undefined);
  assertEquals(optInt("", "x"), undefined);
  assertEquals(optInt("3", "x"), 3);
  assertEquals(reqString(" a ", "n"), "a");
  assertThrows(() => reqString(5, "n"), Error, "n is required");
  assertEquals(parseJson("[1]", "j"), [1]);
  assertEquals(parseJson({ a: 1 }, "j"), { a: 1 });
  assertThrows(() => parseJson("{", "j"), Error, "not valid JSON");
  assertEquals(compact({ a: undefined, b: "", c: null, d: 0, e: false }), {
    c: null,
    d: 0,
    e: false,
  });
  assertEquals(pagingQuery({ page: "2" }), { page: 2, items_per_page: undefined });
});
