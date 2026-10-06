import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  csv,
  describeError,
  expectId,
  expectTrue,
  fieldsObject,
  idList,
  KlickTippError,
  kt,
  list,
  login,
  seg,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("describeError: maps a 406 error code to English, not the German error_message", () => {
  const e = describeError(406, { error: 507, error_message: "E-Mail existiert bereits" });
  assertEquals(e, {
    code: 507,
    message: "KlickTipp error 507: the email address is already assigned to another contact",
  });
});

Deno.test("describeError: error 10 appends its subcode, error 8 names the field", () => {
  assert(
    describeError(406, { error: 10, code: 30 }).message.endsWith("the email address is blocked"),
  );
  const m = describeError(406, {
    error: 8,
    name: "fieldLeadValue",
    reason: "must be a numeric value",
    field_value: "A",
  }).message;
  assert(
    m.includes("fieldLeadValue") && m.includes("must be a numeric value") && m.includes('"A"'),
  );
});

Deno.test("describeError: an array-of-strings body (403/401) is quoted, an unknown shape is generic", () => {
  assertEquals(
    describeError(403, ["API access denied."]).message,
    "KlickTipp HTTP 403: API access denied.",
  );
  assertEquals(
    describeError(502, "<html>").message,
    "KlickTipp HTTP 502: unexpected response body",
  );
});

Deno.test("kt: an {error} body fails even on HTTP 200 — the body decides, not the status", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { error: 5 } }]);
  const err = await assertRejects(
    async () => await kt(ctx, "GET", "/x"),
    KlickTippError,
    "invalid email",
  );
  assertEquals(err.code, 5);
});

Deno.test("kt: a non-JSON 200 is a failure, not a success", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  await assertRejects(async () => await kt(ctx, "GET", "/x"), KlickTippError, "not JSON");
});

Deno.test("kt: builds the query, skips empty values, sends JSON bodies with a content type", async () => {
  const { ctx, calls } = mockCtx([{ body: [true] }]);
  await kt(ctx, "POST", "/p", { query: { a: 1, b: undefined, c: "", d: 0 }, body: { x: 1 } });
  assertEquals(calls[0].url, "https://api.klicktipp.com/p?a=1&d=0");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"x":1}');
});

Deno.test("expectTrue / expectId: demand the documented success shapes", () => {
  assertEquals(expectTrue([true], "x"), true);
  assertEquals(expectId([49], "x"), 49);
  for (const bad of [[false], [], {}, "ok", null]) {
    try {
      expectTrue(bad, "x");
      throw new Error("expectTrue accepted " + JSON.stringify(bad));
    } catch (e) {
      assert(e instanceof KlickTippError);
    }
  }
  for (const bad of [[], ["abc"], {}]) {
    try {
      expectId(bad, "x");
      throw new Error("expectId accepted " + JSON.stringify(bad));
    } catch (e) {
      assert(e instanceof KlickTippError);
    }
  }
});

Deno.test("seg: only alphanumerics pass; slashes, dots and empty do not", () => {
  assertEquals(seg("01234abcdefghij56789", "id"), "01234abcdefghij56789");
  for (const bad of ["", "a/b", "..", "1?x=1", "a b"]) {
    try {
      seg(bad, "id");
      throw new Error("accepted " + bad);
    } catch (e) {
      assert((e as Error).message.includes("alphanumeric"), (e as Error).message);
    }
  }
});

Deno.test("idList: parses, trims, and bounds numeric id lists", () => {
  assertEquals(idList("1, 2,3", "ids", 3), [1, 2, 3]);
  const rejects = (v: string, max = 3) => {
    let msg = "";
    try {
      idList(v, "ids", max);
    } catch (e) {
      msg = (e as Error).message;
    }
    return msg;
  };
  assert(rejects("").includes("at least one"));
  assert(rejects("0").includes("not a numeric ID"));
  assert(rejects("01").includes("not a numeric ID"));
  assert(rejects("1,x").includes("not a numeric ID"));
  assert(rejects("1,2,3,4").includes("at most 3"));
});

Deno.test("csv / list / compact / fieldsObject: input normalisation", () => {
  assertEquals(csv(["a", " b "]), "a,b");
  assertEquals(csv(""), undefined);
  assertEquals(list(undefined, ["x"]), ["x"]);
  assertEquals(list("p,q", ["x"]), ["p", "q"]);
  assertEquals(compact({ a: 1, b: undefined, c: "", d: 0 }), { a: 1, d: 0 });
  assertEquals(fieldsObject({ a: 1, b: null, c: "x" }), { a: "1", b: "", c: "x" });
  assertEquals(fieldsObject('{"a":"1"}'), { a: "1" });
  assertEquals(fieldsObject(undefined), undefined);
  assertEquals(fieldsObject({}), undefined);
  for (const bad of ["not json", "[1]", 5]) {
    try {
      fieldsObject(bad);
      throw new Error("accepted " + bad);
    } catch (e) {
      assert((e as Error).message.includes("JSON object"), (e as Error).message);
    }
  }
});

Deno.test("login: success needs both sessid and session_name in the body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { sessid: "xyz", session_name: "SSESSabc", account: { uid: 1 } },
  }]);
  const s = await login(ctx, "u", "p");
  assertEquals(s, { sessid: "xyz", sessionName: "SSESSabc", account: { uid: 1 } });
  assertEquals(calls[0].url, "https://api.klicktipp.com/account/login");
  assertEquals(JSON.parse(calls[0].body!), { username: "u", password: "p" });
});

Deno.test("login: a 200 without a session is a failure; 401 body is quoted", async () => {
  const a = mockCtx([{ body: { sessid: "xyz" } }]);
  await assertRejects(async () => await login(a.ctx, "u", "p"), KlickTippError, "login failed");
  const b = mockCtx([{ status: 401, body: ["Wrong username or password."] }]);
  await assertRejects(
    async () => await login(b.ctx, "u", "p"),
    KlickTippError,
    "Wrong username or password.",
  );
});
