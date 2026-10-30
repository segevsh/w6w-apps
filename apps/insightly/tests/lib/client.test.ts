import { test } from "node:test";
import { assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import { mockCtx, mockInsightlyCtx } from "../_helpers.ts";
import {
  baseUrl,
  compact,
  errorMessage,
  InsightlyClient,
  podFromConnection,
  unset,
} from "../../lib/client.ts";

test("client: builds the URL from the connection's pod, not a param", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: { CONTACT_ID: 1 } }], "na1");
  await new InsightlyClient(ctx).request("/Contacts/1");
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Contacts/1");
  assertEquals("authorization" in calls[0].headers, false);
});

test("client: fails loudly when the connection carries no pod", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new InsightlyClient(ctx), Error, "no pod");
});

test("client: surfaces Insightly's {Message} error body", async () => {
  const { ctx } = mockInsightlyCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: { Message: "Authorization has been denied for this request." },
  }]);
  await assertRejects(
    () => new InsightlyClient(ctx).request("/Contacts"),
    Error,
    "Authorization has been denied for this request.",
  );
});

test("client: falls back to the raw body when it isn't the {Message} shape", async () => {
  const { ctx } = mockInsightlyCtx([{ status: 500, body: "internal error", headers: {} }]);
  await assertRejects(
    () => new InsightlyClient(ctx).request("/Contacts"),
    Error,
    "internal error",
  );
});

test("client: returns undefined for an empty body (e.g. a 202 delete)", async () => {
  const { ctx } = mockInsightlyCtx([{ status: 202, body: undefined }]);
  assertEquals(
    await new InsightlyClient(ctx).request("/Contacts/1", { method: "DELETE" }),
    undefined,
  );
});

test("client: drops undefined/empty query params", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: [] }]);
  await new InsightlyClient(ctx).request("/Contacts", {
    query: { top: 10, skip: undefined, brief: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("top"), "10");
  assertEquals(url.searchParams.has("skip"), false);
  assertEquals(url.searchParams.has("brief"), false);
});

test("podFromConnection: reads the display data afterConnect records", () => {
  assertEquals(podFromConnection({ display: { pod: "na1" } } as never), "na1");
  assertThrows(() => podFromConnection(undefined), Error, "no pod");
});

test("baseUrl: builds the per-pod host", () => {
  assertEquals(baseUrl("na1"), "https://api.na1.insightly.com/v3.1");
  assertEquals(baseUrl("eu1"), "https://api.eu1.insightly.com/v3.1");
});

test("errorMessage: parses {Message}, falls back to raw text, empty stays empty", () => {
  assertEquals(errorMessage('{"Message":"nope"}'), "nope");
  assertEquals(errorMessage("plain text error"), "plain text error");
  assertEquals(errorMessage(""), "");
});

test("compact/unset drop undefined, null and blank values", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null, d: "x" }), { a: 0, d: "x" });
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});
