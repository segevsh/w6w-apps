import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  apiBase,
  baseFromConnection,
  encodeParams,
  failure,
  idOrEmailList,
  intList,
  jsonValue,
  normalizeSubdomain,
  payload,
  strList,
  ZulipClient,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("normalizeSubdomain: accepts a label, a host or a URL", () => {
  assertEquals(normalizeSubdomain("Acme"), "acme");
  assertEquals(normalizeSubdomain("acme.zulipchat.com"), "acme");
  assertEquals(normalizeSubdomain("https://acme.zulipchat.com/#narrow"), "acme");
  assertEquals(normalizeSubdomain(" my-org "), "my-org");
});

Deno.test("normalizeSubdomain: rejects anything that is not one DNS label", () => {
  for (const bad of ["", "a.b", "evil.com/x", "a b", "-a", "a-", "acme:443", "x@y", undefined, 4]) {
    assertEquals(normalizeSubdomain(bad), undefined, String(bad));
  }
  assertEquals(normalizeSubdomain("evil.com"), undefined);
});

Deno.test("apiBase / baseFromConnection build the org URL, or refuse", () => {
  assertEquals(apiBase("acme"), "https://acme.zulipchat.com/api/v1");
  assertEquals(
    baseFromConnection({ display: { subdomain: "acme" } } as never),
    "https://acme.zulipchat.com/api/v1",
  );
  assertThrows(() => baseFromConnection(undefined), Error, "no organization subdomain");
  assertThrows(() => baseFromConnection({ display: { subdomain: "a b" } } as never));
});

Deno.test("list helpers: strList, idOrEmailList, intList", () => {
  assertEquals(strList(" a, ,b "), ["a", "b"]);
  assertEquals(strList([1, "x"]), ["1", "x"]);
  assertEquals(strList(""), undefined);
  assertEquals(strList(null), undefined);
  assertEquals(idOrEmailList("1, 2"), [1, 2]);
  assertEquals(idOrEmailList("1, a@b.c"), ["1", "a@b.c"]);
  assertEquals(intList("3,4", "x"), [3, 4]);
  assertThrows(() => intList("3,z", "ids"), Error, "ids");
});

Deno.test("encodeParams: scalars as-is, structures JSON-encoded, unset skipped, false kept", () => {
  const p = encodeParams({
    a: "x",
    b: 1,
    c: false,
    d: [1, 2],
    e: { k: "v" },
    f: undefined,
    g: null,
    h: "",
  });
  assertEquals(Object.fromEntries(p), {
    a: "x",
    b: "1",
    c: "false",
    d: "[1,2]",
    e: '{"k":"v"}',
    h: "",
  });
});

Deno.test("jsonValue: parses text, passes through junk, drops blank", () => {
  assertEquals(jsonValue('[{"a":1}]'), [{ a: 1 }]);
  assertEquals(jsonValue("nope"), "nope");
  assertEquals(jsonValue("  "), undefined);
  assertEquals(jsonValue([1]), [1]);
});

Deno.test("payload: strips the result/msg envelope only", () => {
  assertEquals(
    payload({ result: "success", msg: "", ignored_parameters_unsupported: ["x"], id: 1 }),
    { id: 1 },
  );
});

Deno.test("failure: includes status, msg, code and the rate-limit retry hint", () => {
  assertEquals(
    failure("GET", "/x", { status: 429 }, {
      msg: "slow",
      code: "RATE_LIMIT_HIT",
      "retry-after": 3,
    }),
    "Zulip GET /x failed: HTTP 429 — slow [RATE_LIMIT_HIT] (retry after 3s)",
  );
  assertEquals(
    failure("GET", "/x", { status: 301 }, undefined).includes("custom domain"),
    true,
  );
});

Deno.test("ZulipClient: a 200 body with result=error is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { result: "error", msg: "nope", code: "BAD_REQUEST" } }]);
  await assertRejects(
    async () => await new ZulipClient(ctx).request("GET", "/x"),
    Error,
    "nope [BAD_REQUEST]",
  );
});

Deno.test("ZulipClient: a form body sets the urlencoded content type; a GET sets none", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "" } }, { body: {} }]);
  const c = new ZulipClient(ctx);
  await c.request("POST", "/p", { form: { a: 1 } });
  await c.request("GET", "/g", { query: { q: "a b" } });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "a=1");
  assertEquals(calls[1].headers["content-type"], undefined);
  assertEquals(calls[1].url, "https://acme.zulipchat.com/api/v1/g?q=a+b");
});
