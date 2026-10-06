import { assert, assertEquals, assertRejects } from "@std/assert";
import { buildQuery, errorText, jsonValue, LushaClient, seg, strList } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("helpers: seg, strList, jsonValue, buildQuery", () => {
  assertEquals(seg("a b/c"), "a%20b%2Fc");
  assertEquals(strList(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(strList(["x"]), ["x"]);
  assertEquals(strList(""), undefined);
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("not json"), "not json");
  assertEquals(jsonValue("  "), undefined);
  assertEquals(buildQuery({ a: 1, b: "", c: undefined, d: "x y" }), "?a=1&d=x+y");
  assertEquals(buildQuery({}), "");
});

Deno.test("errorText: both of Lusha's error shapes", () => {
  assertEquals(errorText({ statusCode: 401, message: "Invalid API key" }), "Invalid API key");
  assertEquals(errorText({ message: ["a", "b"] }), "a; b");
  assertEquals(
    errorText({ error: "invalid_request", error_description: "missing x" }),
    "missing x",
  );
  assertEquals(errorText(null, "  raw  "), "raw");
});

Deno.test("request: sends no credential, parses JSON, empty body is {}", async () => {
  const { ctx, calls } = mockCtx([{ body: { a: 1 } }, { status: 204 }]);
  const c = new LushaClient(ctx);
  assertEquals(await c.request("POST", "/x", { body: { q: 1 } }), { a: 1 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(await c.request("GET", "/y"), {});
});

Deno.test("request: failures carry status, vendor text and a hint for 402/429", async () => {
  const c = new LushaClient(
    mockCtx([
      { status: 402, body: { statusCode: 402, message: "No credits" } },
      { status: 429, body: { message: "slow down" } },
      { status: 500, body: "boom" },
    ]).ctx,
  );
  const e1 = await assertRejects(() => c.request("GET", "/a"), Error);
  assert(
    e1.message.includes("HTTP 402") && e1.message.includes("No credits") &&
      e1.message.includes("out of credits"),
  );
  const e2 = await assertRejects(() => c.request("GET", "/a"), Error);
  assert(e2.message.includes("rate limited"));
  const e3 = await assertRejects(() => c.request("GET", "/a"), Error);
  assert(e3.message.includes("boom"));
});
