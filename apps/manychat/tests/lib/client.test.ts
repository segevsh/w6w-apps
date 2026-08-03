import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  coerceFieldValue,
  compact,
  formatError,
  ManychatClient,
} from "../../lib/client.ts";

// ------------------------------------------------------------------- base URL

Deno.test("client: base URL is the one Manychat's own PHP SDK hardcodes", () => {
  assertEquals(API_URL, "https://api.manychat.com");
});

// -------------------------------------------------------------------- request

Deno.test("client: GET puts query params on the URL and drops empty ones", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await new ManychatClient(ctx).get("/fb/subscriber/getInfo", {
    subscriber_id: "123",
    blank: "",
    missing: undefined,
    nulled: null,
  });
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.manychat.com/fb/subscriber/getInfo");
  assertEquals(url.searchParams.get("subscriber_id"), "123");
  assert(!url.searchParams.has("blank"));
  assert(!url.searchParams.has("missing"));
  assert(!url.searchParams.has("nulled"));
});

Deno.test("client: POST sends JSON with a content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await new ManychatClient(ctx).post("/fb/page/createTag", { name: "vip" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "vip" });
});

Deno.test("client: never sets an Authorization header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await new ManychatClient(ctx).get("/fb/page/getInfo");
  assert(!("authorization" in calls[0].headers), "client must not sign");
});

// -------------------------------------------------------------------- failure

Deno.test("client: a non-2xx throws with the vendor message, never the request", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { status: "error", message: "Wrong token" } },
  ]);
  const err = await assertRejects(
    () => new ManychatClient(ctx).get("/fb/page/getInfo"),
    Error,
  );
  assert(err.message.includes("Wrong token"), err.message);
  assert(err.message.includes("/fb/page/getInfo"), err.message);
});

Deno.test("client: a 200 carrying `status: error` is a failure, not a success", async () => {
  // This is the trap `res.ok` alone would walk into.
  const { ctx } = mockCtx([
    { status: 200, body: { status: "error", message: "Subscriber not found" } },
  ]);
  const err = await assertRejects(
    () => new ManychatClient(ctx).get("/fb/subscriber/getInfo", { subscriber_id: "1" }),
    Error,
  );
  assert(err.message.includes("Subscriber not found"), err.message);
});

Deno.test("client: a non-JSON error body degrades to the status alone", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: "<!DOCTYPE html><html>404</html>",
      headers: { "content-type": "text/html" },
    },
  ]);
  const err = await assertRejects(
    () => new ManychatClient(ctx).get("/fb/nope"),
    Error,
  );
  assert(err.message.includes("HTTP 404"), err.message);
  assert(!err.message.includes("DOCTYPE"), "must not echo the HTML body");
});

Deno.test("client: a success envelope is returned whole, `status` included", async () => {
  const { ctx } = mockCtx([{ body: { status: "success", data: { id: 7 } } }]);
  const out = await new ManychatClient(ctx).get<{ status: string; data: { id: number } }>(
    "/fb/page/getInfo",
  );
  assertEquals(out.status, "success");
  assertEquals(out.data.id, 7);
});

// ---------------------------------------------------------------- formatError

Deno.test("formatError: folds details.messages[] into the summary", () => {
  const out = formatError(400, {
    status: "error",
    message: "Validation failed",
    details: { messages: [{ message: "name is required" }, { message: "type is invalid" }] },
  });
  assertEquals(out, "HTTP 400: Validation failed — name is required; type is invalid");
});

Deno.test("formatError: renders the `code` variant", () => {
  assertEquals(
    formatError(400, { status: "error", message: "nope", code: 17 }),
    "HTTP 400 (code 17): nope",
  );
});

Deno.test("formatError: an absent body degrades to the status", () => {
  assertEquals(formatError(500, undefined), "HTTP 500");
});

// -------------------------------------------------------------------- compact

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }),
    { a: 1, e: false, f: 0 },
  );
});

// --------------------------------------------------------- coerceFieldValue

Deno.test("coerceFieldValue: coerces the two unambiguous string cases", () => {
  assertEquals(coerceFieldValue("true"), true);
  assertEquals(coerceFieldValue("false"), false);
  assertEquals(coerceFieldValue("42"), 42);
  assertEquals(coerceFieldValue("-7"), -7);
  assertEquals(coerceFieldValue("0"), 0);
  assertEquals(coerceFieldValue("3.5"), 3.5);
});

Deno.test("coerceFieldValue: leaves dates, reference codes and prose alone", () => {
  // A leading-zero reference code turned into an integer is data loss.
  assertEquals(coerceFieldValue("007"), "007");
  assertEquals(coerceFieldValue("2026-08-03"), "2026-08-03");
  assertEquals(coerceFieldValue("2026-08-03T00:00:00+00:00"), "2026-08-03T00:00:00+00:00");
  assertEquals(coerceFieldValue("1e5"), "1e5");
  assertEquals(coerceFieldValue(" 1"), " 1");
  assertEquals(coerceFieldValue("TRUE"), "TRUE");
  assertEquals(coerceFieldValue("hello"), "hello");
});

Deno.test("coerceFieldValue: passes non-strings straight through", () => {
  assertEquals(coerceFieldValue(5), 5);
  assertEquals(coerceFieldValue(true), true);
  assertEquals(coerceFieldValue(undefined), undefined);
});
