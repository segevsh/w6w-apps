import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  graphError,
  jsonParam,
  MessengerClient,
  pageSegment,
  requireString,
} from "../../lib/client.ts";

Deno.test("client: GET builds the URL on the v26.0 Graph host and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  await new MessengerClient(ctx).request("/me/x", { query: { a: "1", b: "", c: undefined } });
  assertEquals(calls[0].url, "https://graph.facebook.com/v26.0/me/x?a=1");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assert(!("authorization" in calls[0].headers));
});

Deno.test("client: JSON body sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MessengerClient(ctx).request("/me/x", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("client: HTTP error is raised with Graph code, subcode and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { message: "bad recipient", code: 100, error_subcode: 2018001 } },
  }]);
  const err = await assertRejects(() => new MessengerClient(ctx).request("/me/messages"));
  assert(err instanceof Error);
  assert(err.message.includes("code 100/2018001"));
  assert(err.message.includes("bad recipient"));
});

Deno.test("client: an error envelope on a 200 is still an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { error: { message: "nope", code: 10 } } }]);
  await assertRejects(() => new MessengerClient(ctx).request("/me/messages"), Error, "nope");
});

Deno.test("client: non-Graph error body falls back to the text", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway", statusText: "Bad Gateway" }]);
  await assertRejects(() => new MessengerClient(ctx).request("/x"), Error, "bad gateway");
});

Deno.test("client: refuses a non-Graph host", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => new MessengerClient(ctx).request("https://evil.example.com/x"),
    Error,
    "only graph.facebook.com",
  );
  assertEquals(calls.length, 0);
});

Deno.test("client: pageSegment defaults to me and encodes", () => {
  assertEquals(pageSegment(), "me");
  assertEquals(pageSegment("  "), "me");
  assertEquals(pageSegment("123"), "123");
  assertEquals(pageSegment("a/b"), "a%2Fb");
});

Deno.test("client: jsonParam accepts objects and strings, rejects junk and absence", () => {
  assertEquals(jsonParam("x", [1]), [1]);
  assertEquals(jsonParam("x", "[1]"), [1]);
  try {
    jsonParam("x", "{nope");
    throw new Error("unreachable");
  } catch (e) {
    assertEquals((e as Error).message, "x is not valid JSON");
  }
  try {
    jsonParam("x", undefined);
    throw new Error("unreachable");
  } catch (e) {
    assertEquals((e as Error).message, "x is required");
  }
});

Deno.test("client: requireString and graphError", () => {
  assertEquals(requireString("a", "v"), "v");
  try {
    requireString("a", " ");
    throw new Error("unreachable");
  } catch (e) {
    assertEquals((e as Error).message, "a is required");
  }
  assertEquals(graphError({ error: { code: 1 } })?.code, 1);
  assertEquals(graphError({ id: "1" }), undefined);
  assertEquals(graphError(null), undefined);
});
