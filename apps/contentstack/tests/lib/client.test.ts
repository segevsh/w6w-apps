import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  apiBase,
  asRegion,
  bool,
  call,
  compact,
  HOSTS,
  int,
  jsonArray,
  jsonObject,
  need,
  regionFromConnection,
  REGIONS,
  seg,
  str,
  strList,
} from "../../lib/client.ts";

Deno.test("regions: seven fixed hosts, unknown values fall back to NA", () => {
  assertEquals(REGIONS.length, 7);
  assertEquals(apiBase("na"), "https://api.contentstack.io/v3");
  assertEquals(apiBase("au"), "https://au-api.contentstack.com/v3");
  assertEquals(Object.values(HOSTS).length, 7);
  assertEquals(asRegion("mars"), "na");
  assertEquals(regionFromConnection(undefined), "na");
  assertEquals(regionFromConnection({ display: { region: "gcp-na" } } as never), "gcp-na");
  assertEquals(regionFromConnection({ display: { region: "nope" } } as never), "na");
});

Deno.test("readers: coerce and validate", () => {
  assertEquals(str("  a "), "a");
  assertEquals(str(""), undefined);
  assertEquals(str(5), "5");
  assertEquals(int("n", "7"), 7);
  assertEquals(int("n", undefined), undefined);
  assertThrows(() => int("n", "1.5"), Error, "`n` must be an integer");
  assertEquals(bool("true"), true);
  assertEquals(bool(false), false);
  assertEquals(bool("maybe"), undefined);
  assertEquals(jsonObject("o", '{"a":1}'), { a: 1 });
  assertEquals(jsonObject("o", { a: 1 }), { a: 1 });
  assertThrows(() => jsonObject("o", "[1]"), Error, "`o` must be a JSON object");
  assertThrows(() => jsonObject("o", "{bad"), Error, "`o` is not valid JSON");
  assertEquals(jsonArray("a", "[1,2]"), [1, 2]);
  assertThrows(() => jsonArray("a", "{}"), Error, "`a` must be a JSON array");
  assertEquals(strList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(strList(["x", 2]), ["x", "2"]);
  assertEquals(strList(" , "), undefined);
  assertEquals(need("n", "v"), "v");
  assertThrows(() => need("n", undefined), Error, "`n` is required");
  assertEquals(seg("a/b c"), "a%2Fb%20c");
  assertEquals(compact({ a: 1, b: undefined }), { a: 1 });
});

Deno.test("call: builds the URL, skips undefined query values and JSON-encodes objects", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  const out = await call(ctx, "GET", "/x", { query: { a: 1, b: undefined, q: { t: "h" } } });
  assertEquals(out, { ok: 1 });
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/x?a=1&q=%7B%22t%22%3A%22h%22%7D");
});

Deno.test("call: sends body as JSON, the branch header and extra headers; drops undefined headers", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await call(ctx, "POST", "/x", {
    body: { a: 1 },
    branch: "dev",
    headers: { api_version: "3.2", organization_uid: undefined },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["branch"], "dev");
  assertEquals(calls[0].headers["api_version"], "3.2");
  assertEquals("organization_uid" in calls[0].headers, false);
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("call: an empty 2xx body is an empty object, a non-object body is wrapped", async () => {
  const empty = mockCtx([{ status: 204 }]);
  assertEquals(await call(empty.ctx, "DELETE", "/x"), {});
  const arr = mockCtx([{ body: [1, 2] }]);
  assertEquals(await call(arr.ctx, "GET", "/x"), { data: [1, 2] });
});

Deno.test("call: errors carry the vendor message, code and field errors", async () => {
  const { ctx } = mockCtx([{
    status: 412,
    body: { error_message: "nope", error_code: 109, errors: { api_key: ["is not valid."] } },
  }]);
  await assertRejects(
    () => call(ctx, "GET", "/x"),
    Error,
    'Contentstack 412 for GET /x: nope (code 109) {"api_key":["is not valid."]}',
  );
});

Deno.test("call: a non-JSON error body is quoted raw and truncated", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "x".repeat(500), headers: {} }]);
  await assertRejects(
    () => call(ctx, "GET", "/x"),
    Error,
    `Contentstack 502 for GET /x: ${"x".repeat(300)}`,
  );
});
