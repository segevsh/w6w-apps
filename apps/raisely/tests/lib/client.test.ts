import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  compact,
  customFields,
  formatRaiselyError,
  parseError,
  pick,
  RaiselyClient,
  scrub,
  seg,
  toUuids,
  truncate,
} from "../../lib/client.ts";
import { listQuery } from "../../lib/params.ts";
import { envelope, errorBody, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("compact: drops unset and empty, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("asOptionalJson: parses a string, passes an object, rejects malformed JSON", () => {
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson("", "x"), undefined);
  assertThrows(() => asOptionalJson("{nope", "thing"), Error, "thing is not valid JSON");
});

Deno.test("seg / toUuids / truncate / pick / customFields", () => {
  assertEquals(seg(" a/b "), "a%2Fb");
  assertEquals(toUuids(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toUuids(undefined), []);
  assertEquals(truncate("x".repeat(900)).endsWith("(900 bytes truncated)"), true);
  assertEquals(pick({ a: 1, b: undefined, c: "z" }, ["a", "b", "c"]), { a: 1, c: "z" });
  assertEquals(customFields({ public: '{"a":1}', private_fields: { b: 2 } }), {
    public: { a: 1 },
    private: { b: 2 },
  });
  assertEquals(customFields({}), {});
});

Deno.test("scrub: removes accessToken at any depth, in arrays and nested objects", () => {
  const out = scrub<unknown>({
    accessToken: "t0",
    user: { accessToken: "t1", email: "a@b.org" },
    list: [{ accessToken: "t2", n: 1 }],
  });
  assertEquals(out, { user: { email: "a@b.org" }, list: [{ n: 1 }] });
  assertEquals(scrub(null), null);
  assertEquals(scrub("s"), "s");
});

Deno.test("parseError / formatRaiselyError: read the vendor's code, detail and subcode", () => {
  const raw = JSON.stringify(errorBody("unauthorized", "You must login again", "invalid token"));
  assertEquals(parseError(raw), {
    code: "unauthorized",
    detail: "You must login again",
    subcode: "invalid token",
  });
  assertEquals(
    formatRaiselyError(401, "GET", "/v3/campaigns", raw),
    "Raisely 401 for GET /v3/campaigns: unauthorized: invalid token: You must login again",
  );
  assert(
    formatRaiselyError(429, "GET", "/x", '{"code":"rate limit exceeded"}').includes("rate limited"),
  );
  assertEquals(parseError("<html>"), {});
  assertEquals(
    formatRaiselyError(502, "GET", "/x", "<html>bad</html>"),
    "Raisely 502 for GET /x: <html>bad</html>",
  );
  assertEquals(formatRaiselyError(500, "GET", "/x", ""), "Raisely 500 for GET /x: (empty body)");
});

Deno.test("listQuery: only the set list params, private kept when false", () => {
  assertEquals(listQuery({ private: false, limit: 3 }), { private: false, limit: 3 });
  assertEquals(listQuery({}), {});
});

Deno.test("RaiselyClient: data unwraps, list keeps the envelope, 204 is undefined", async () => {
  const c1 = mockCtx([{ body: envelope({ a: 1 }) }]);
  assertEquals(await new RaiselyClient(c1.ctx).data("/x"), { a: 1 });
  assertEquals(c1.calls[0].url, "https://api.raisely.com/v3/x");
  assertEquals(c1.calls[0].headers.accept, "application/json");
  assertEquals(c1.calls[0].headers.authorization, undefined);

  const c2 = mockCtx([{ body: listEnvelope([1, 2]) }]);
  const page = await new RaiselyClient(c2.ctx).list("/x");
  assertEquals(page.data, [1, 2]);
  assertEquals(page.pagination.total, 2);

  const c3 = mockCtx([{ status: 204 }]);
  assertEquals(await new RaiselyClient(c3.ctx).data("/x", { method: "DELETE" }), undefined);
});

Deno.test("RaiselyClient: a body sets content-type; array query values are comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await new RaiselyClient(ctx).data("/x", {
    method: "POST",
    query: { a: ["1", "2"], b: undefined, c: "" },
    body: { data: {} },
  });
  assertEquals(calls[0].url, "https://api.raisely.com/v3/x?a=1%2C2");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"data":{}}');
});
