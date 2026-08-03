import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  compact,
  encodeId,
  habitPayload,
  optionalDate,
  projectPath,
  projectTaskPath,
  taskPayload,
  TickTickClient,
  ticktickDate,
} from "../../lib/client.ts";

Deno.test("client: the base is the documented Open API v1 host", () => {
  assertEquals(API_URL, "https://api.ticktick.com/open/v1");
});

Deno.test("client: request builds an absolute URL and asks for JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "P1" } }]);
  const client = new TickTickClient(ctx);
  const out = await client.request("/project/P1");
  assertEquals(out, { id: "P1" });
  assertEquals(calls[0].url, "https://api.ticktick.com/open/v1/project/P1");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
  // No body, so no content-type.
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: a body sets content-type and is JSON-encoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new TickTickClient(ctx).request("/task", { method: "POST", body: { title: "x" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { title: "x" });
});

Deno.test("client: empty / null / undefined query values are dropped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await new TickTickClient(ctx).request("/focus", {
    query: { from: "a", to: "", type: 0, missing: undefined, nope: null },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("from"), "a");
  assertEquals(url.searchParams.get("type"), "0");
  assert(!url.searchParams.has("to"));
  assert(!url.searchParams.has("missing"));
  assert(!url.searchParams.has("nope"));
});

Deno.test("client: status() tolerates the empty body of a No-Content success", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  const out = await new TickTickClient(ctx).status("/project/P1", { method: "DELETE" });
  assertEquals(out, { status: 200 });
});

Deno.test("client: list() guarantees an array even when the body is not one", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { error: "nope" } }]);
  assertEquals(await new TickTickClient(ctx).list("/project"), []);
});

Deno.test("client: list() passes a real array through", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ id: "a" }, { id: "b" }] }]);
  assertEquals(await new TickTickClient(ctx).list("/project"), [{ id: "a" }, { id: "b" }]);
});

Deno.test("client: an error surfaces TickTick's own error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: {
      error: "invalid_token",
      error_description: "Invalid access token",
      errors: [{ message: "Invalid access token" }],
    },
  }]);
  const err = await assertRejects(() => new TickTickClient(ctx).request("/project"));
  assert(err instanceof Error);
  assert(err.message.includes("401"));
  assert(err.message.includes("invalid_token"));
  assert(err.message.includes("/open/v1/project"));
});

Deno.test("client: an error message carries the path, never the full URL or a query string", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "forbidden" } }]);
  const err = await assertRejects(() =>
    new TickTickClient(ctx).request("/focus/F1", { query: { type: 0 } })
  );
  assert(err instanceof Error);
  assert(err.message.includes("/open/v1/focus/F1"));
  assert(!err.message.includes("https://"));
  assert(!err.message.includes("type=0"));
});

Deno.test("client: a non-JSON error body is reported verbatim rather than swallowed", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    body: "<html>bad gateway</html>",
    headers: { "content-type": "text/html" },
  }]);
  const err = await assertRejects(() => new TickTickClient(ctx).request("/project"));
  assert(err instanceof Error);
  assert(err.message.includes("bad gateway"));
});

// --------------------------------------------------------------- dates --

Deno.test("ticktickDate: a trailing Z becomes a numeric +0000 offset", () => {
  assertEquals(ticktickDate("2026-08-10T17:00:00Z"), "2026-08-10T17:00:00+0000");
});

Deno.test("ticktickDate: a colon-bearing offset loses its colon", () => {
  assertEquals(ticktickDate("2026-08-10T17:00:00+02:00"), "2026-08-10T17:00:00+0200");
  assertEquals(ticktickDate("2026-08-10T17:00:00-08:00"), "2026-08-10T17:00:00-0800");
});

Deno.test("ticktickDate: an offset already in the documented form is untouched", () => {
  assertEquals(ticktickDate("2019-11-13T03:00:00+0000"), "2019-11-13T03:00:00+0000");
});

Deno.test("ticktickDate: fractional seconds are stripped", () => {
  assertEquals(ticktickDate("2026-03-01T00:58:20.000+0000"), "2026-03-01T00:58:20+0000");
  assertEquals(ticktickDate("2026-03-01T00:58:20.123Z"), "2026-03-01T00:58:20+0000");
});

Deno.test("ticktickDate: a naive timestamp is assumed UTC", () => {
  assertEquals(ticktickDate("2026-08-10T17:00:00"), "2026-08-10T17:00:00+0000");
});

Deno.test("ticktickDate: a datetime-local value without seconds gets them", () => {
  assertEquals(ticktickDate("2026-08-10T17:00"), "2026-08-10T17:00:00+0000");
});

Deno.test("ticktickDate: a space separator is normalised to T", () => {
  assertEquals(ticktickDate("2026-08-10 17:00:00Z"), "2026-08-10T17:00:00+0000");
});

Deno.test("ticktickDate: an unrecognisable value passes through rather than being mangled", () => {
  assertEquals(ticktickDate("next tuesday"), "next tuesday");
  assertEquals(ticktickDate(""), "");
});

Deno.test("optionalDate: undefined stays undefined", () => {
  assertEquals(optionalDate(undefined), undefined);
  assertEquals(optionalDate("2026-08-10T17:00:00Z"), "2026-08-10T17:00:00+0000");
});

// -------------------------------------------------------------- shapes --

Deno.test("compact: drops undefined but keeps null, false, 0 and empty string", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: false, d: 0, e: "" }),
    { b: null, c: false, d: 0, e: "" },
  );
});

Deno.test("encodeId: an id can never break out of its path segment", () => {
  assertEquals(encodeId("../../project"), "..%2F..%2Fproject");
  assertEquals(encodeId("6226ff9877acee87727f6bca"), "6226ff9877acee87727f6bca");
});

Deno.test("projectPath / projectTaskPath encode both segments", () => {
  assertEquals(projectPath("../x"), "/project/..%2Fx");
  assertEquals(projectTaskPath("P/1", "T/2"), "/project/P%2F1/task/T%2F2");
});

Deno.test("taskPayload: converts dates and omits everything unset", () => {
  assertEquals(
    taskPayload({ title: "t", dueDate: "2026-08-10T17:00:00Z", priority: 3 }),
    { title: "t", dueDate: "2026-08-10T17:00:00+0000", priority: 3 },
  );
});

Deno.test("taskPayload: passes subtasks through verbatim", () => {
  const items = [{ title: "sub", status: 0 }];
  assertEquals(taskPayload({ items }).items, items);
});

Deno.test("habitPayload: enumerates fields, so a stray input key never becomes a body field", () => {
  const body = habitPayload(
    { name: "Read", goal: 2, extra: "nope" } as unknown as Parameters<typeof habitPayload>[0],
  );
  assertEquals(body, { name: "Read", goal: 2 });
});
