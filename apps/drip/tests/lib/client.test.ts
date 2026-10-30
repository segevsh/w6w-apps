import { test } from "node:test";
import { assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import { mockCtx, mockDripCtx } from "../_helpers.ts";
import {
  accountIdFromConnection,
  API_BASE,
  compact,
  DripClient,
  jsonObject,
  unset,
} from "../../lib/client.ts";

test("client: scopes requests under the connection's account id, not a param", async () => {
  const { ctx, calls } = mockDripCtx([{ body: { subscribers: [] } }], "1234567");
  await new DripClient(ctx).request("/subscribers");
  assertEquals(calls[0].url, "https://api.getdrip.com/v2/1234567/subscribers");
  assertEquals("authorization" in calls[0].headers, false);
});

test("client: fails loudly when the connection carries no account id", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new DripClient(ctx), Error, "no account id");
});

test("client: surfaces Drip's error body", async () => {
  const { ctx } = mockDripCtx([{
    status: 422,
    statusText: "Unprocessable Entity",
    body:
      '{"errors":[{"code":"presence_error","attribute":"email","message":"Email is required"}]}',
  }]);
  await assertRejects(
    () => new DripClient(ctx).request("/subscribers", { method: "POST", body: {} }),
    Error,
    "Email is required",
  );
});

test("client: returns undefined for a 204", async () => {
  const { ctx } = mockDripCtx([{ status: 204 }]);
  assertEquals(
    await new DripClient(ctx).request("/subscribers/1/unsubscribe_all", { method: "POST" }),
    undefined,
  );
});

test("client: drops undefined/null query params", async () => {
  const { ctx, calls } = mockDripCtx([{ body: { tags: [] } }]);
  await new DripClient(ctx).request("/subscribers", {
    query: { status: "active", tags: undefined, page: null },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.has("tags"), false);
  assertEquals(url.searchParams.has("page"), false);
});

test("accountIdFromConnection: reads the display data afterConnect records", () => {
  assertEquals(
    accountIdFromConnection({ display: { accountId: "1234567" } } as never),
    "1234567",
  );
  assertThrows(() => accountIdFromConnection(undefined), Error, "no account id");
});

test("API_BASE: is Drip's documented v2 root", () => {
  assertEquals(API_BASE, "https://api.getdrip.com/v2");
});

test("compact: drops undefined, null, and empty-string values only", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null, d: "", e: false }), { a: 0, e: false });
});

test("unset: treats a blank string as absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});

test("jsonObject: accepts the flat map, as a string or object", () => {
  assertEquals(jsonObject({ shirt_size: "Medium" }, "customFields"), { shirt_size: "Medium" });
  assertEquals(jsonObject('{"shirt_size":"Medium"}', "customFields"), { shirt_size: "Medium" });
  assertEquals(jsonObject("", "customFields"), undefined);
  assertEquals(jsonObject({}, "customFields"), undefined);
});

test("jsonObject: rejects a non-object rather than sending nonsense", () => {
  assertThrows(() => jsonObject('"nope"', "customFields"), Error, "must be a JSON object");
  assertThrows(() => jsonObject("[1,2]", "properties"), Error, "must be a JSON object");
});
