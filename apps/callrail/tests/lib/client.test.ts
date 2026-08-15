import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  CallRailClient,
  encodeId,
  formatCallRailError,
  toList,
} from "../../lib/client.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("client: array query params use CallRail's repeated key[]= form", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await new CallRailClient(ctx).json("/a/ACC1/calls.json", {
    query: { "tags": ["A", "B"] },
  });
  assertEquals(queryAllOf(calls[0].url, "tags"), ["A", "B"]);
  // Not the comma-joined form some other vendors use.
  assertEquals(queryOf(calls[0].url).tags, undefined);
});

Deno.test("client: scalar query params are set plainly, and empty/undefined values are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CallRailClient(ctx).json("/a/ACC1.json", {
    query: { fields: "numeric_id", company_id: undefined, search: "" },
  });
  const q = queryOf(calls[0].url);
  assertEquals(q.fields, "numeric_id");
  assertEquals("company_id" in q, false);
  assertEquals("search" in q, false);
});

Deno.test("client: false and 0 survive query filtering — they are meaningful values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CallRailClient(ctx).json("/a/ACC1/calls/summary.json", {
    query: { first_time_callers: false, min_duration: 0 },
  });
  const q = queryOf(calls[0].url);
  assertEquals(q.first_time_callers, "false");
  assertEquals(q.min_duration, "0");
});

Deno.test("client: json() parses the body and status() returns just the status", async () => {
  const { ctx: ctx1 } = mockCtx([{ status: 201, body: { id: "CAL1" } }]);
  const created = await new CallRailClient(ctx1).json("/a/ACC1/calls.json", { method: "POST" });
  assertEquals(created, { id: "CAL1" });

  const { ctx: ctx2 } = mockCtx([{ status: 204 }]);
  const status = await new CallRailClient(ctx2).status("/a/ACC1/tags/1.json", { method: "DELETE" });
  assertEquals(status, 204);
});

Deno.test("client: a JSON body is sent with the content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CallRailClient(ctx).json("/a/ACC1/companies.json", {
    method: "POST",
    body: { name: "Widget Shop" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Widget Shop" });
});

Deno.test("client: an error response throws with the vendor's message and the request path", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "HTTP Token: Access denied" } }]);
  await assertRejects(
    () => new CallRailClient(ctx).json("/a.json"),
    Error,
    "HTTP Token: Access denied",
  );
});

Deno.test("formatCallRailError: surfaces the vendor's own flat-string message", () => {
  const msg = formatCallRailError(401, "GET", "/v3/a.json", JSON.stringify({ error: "nope" }));
  assert(msg.includes("401"));
  assert(msg.includes("nope"));
});

Deno.test("formatCallRailError: 429 adds a rate-limit hint", () => {
  const msg = formatCallRailError(429, "POST", "/v3/a/ACC1/text-messages.json", "{}");
  assert(/rate.?limit/i.test(msg));
});

Deno.test("formatCallRailError: falls back to the raw body when it is not JSON", () => {
  const msg = formatCallRailError(500, "GET", "/v3/a.json", "<html>oops</html>");
  assert(msg.includes("<html>oops</html>"));
});

Deno.test("encodeId: neutralises a stray path separator without mangling ordinary ids", () => {
  assertEquals(
    encodeId("ACC8154748ae6bd4e278a7cddd38a662f4f"),
    "ACC8154748ae6bd4e278a7cddd38a662f4f",
  );
  assertEquals(encodeId("weird/id"), "weird%2Fid");
});

Deno.test("toList: accepts a comma string or an array, trims, drops empties", () => {
  assertEquals(toList("A, B,,C"), ["A", "B", "C"]);
  assertEquals(toList(["A", " B "]), ["A", "B"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("asOptionalJson: parses a JSON string, passes through an object, rejects garbage", () => {
  assertEquals(asOptionalJson('{"a":1}', "Form data"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "Form data"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "Form data"), undefined);
  assertThrows(() => asOptionalJson("{not json", "Form data"), Error, "not valid JSON");
});

Deno.test("client: pathOf/queryOf helpers read the recorded call correctly", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CallRailClient(ctx).json("/a/ACC1/calls.json", { query: { page: 2 } });
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/calls.json");
  assertEquals(queryOf(calls[0].url).page, "2");
});
