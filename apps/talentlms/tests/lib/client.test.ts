import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockTalentLmsCtx } from "../_helpers.ts";
import {
  baseUrl,
  customFieldPairs,
  domainFromConnection,
  encodeArg,
  errorDetail,
  flag,
  pathArgs,
  TalentLmsClient,
} from "../../lib/client.ts";

Deno.test("baseUrl: the account host plus /api/v1", () => {
  assertEquals(baseUrl("acme"), "https://acme.talentlms.com/api/v1");
});

Deno.test("domainFromConnection: reads display.domain and refuses a connection without one", () => {
  assertEquals(
    domainFromConnection({ display: { domain: "acme" } } as never),
    "acme",
  );
  assertThrows(() => domainFromConnection(undefined), Error, "no domain");
});

Deno.test("pathArgs: key:value pairs, unset values dropped, separators escaped", () => {
  assertEquals(pathArgs({ user_id: 7, course_id: 4 }), "user_id:7,course_id:4");
  assertEquals(pathArgs({ a: undefined, b: null, c: "", d: 0, e: false }), "d:0,e:false");
  assertEquals(pathArgs({ v: "a,b:c d" }), "v:a%2Cb%3Ac%20d");
  assertEquals(encodeArg("ann@example.com"), "ann@example.com");
});

Deno.test("flag: maps booleans to the vendor's wording and leaves unset alone", () => {
  assertEquals(flag(true, "on", "off"), "on");
  assertEquals(flag(false, "yes", "no"), "no");
  assertEquals(flag(undefined, "on", "off"), undefined);
});

Deno.test("customFieldPairs: numeric keys become custom_field_N; strings parse", () => {
  assertEquals(customFieldPairs({ "3": "x", custom_field_5: "on" }), {
    custom_field_3: "x",
    custom_field_5: "on",
  });
  assertEquals(customFieldPairs('{"1":"a"}'), { custom_field_1: "a" });
  assertEquals(customFieldPairs(undefined), {});
  assertThrows(() => customFieldPairs([1]), Error, "JSON object");
});

Deno.test("errorDetail: pulls the vendor message out of the error envelope", () => {
  assertEquals(errorDetail('{"error":{"type":"api_error","message":"Bad key"}}'), "Bad key");
  assertEquals(errorDetail('{"error":"plain"}'), "plain");
  assertEquals(errorDetail("<html>nope</html>"), "<html>nope</html>");
});

Deno.test("client: get with no args hits the bare endpoint, with args appends one segment", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: [] }, { body: {} }]);
  const c = new TalentLmsClient(ctx);
  await c.get("courses");
  await c.get("courses", { id: 3 });
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/courses");
  assertEquals(calls[1].url, "https://acme.talentlms.com/api/v1/courses/id:3");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: post sends a form body without unset fields", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: {} }]);
  await new TalentLmsClient(ctx).post("creategroup", { name: "A b", key: undefined, price: "" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, "name=A+b");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("client: a non-2xx surfaces the vendor's message", async () => {
  const { ctx } = mockTalentLmsCtx([{
    status: 404,
    statusText: "Not Found",
    body: {
      error: { type: "invalid_request_error", message: "The requested user does not exist" },
    },
  }]);
  await assertRejects(
    () => new TalentLmsClient(ctx).get("users", { id: 9 }),
    Error,
    "TalentLMS 404 Not Found for GET /api/v1/users/id:9: The requested user does not exist",
  );
});

Deno.test("client: refuses to run on a connection without a domain", () => {
  assertThrows(() => new TalentLmsClient(mockCtx().ctx), Error, "no domain");
});
