import { assertEquals, assertRejects } from "@std/assert";
import {
  asJson,
  asOptionalJson,
  compact,
  encodeId,
  formatPodiumError,
  PodiumClient,
  range,
  toList,
} from "../../lib/client.ts";
import { API, mockCtx } from "../_helpers.ts";

Deno.test("client: list() returns items and the metadata cursor; absent cursor is null", async () => {
  const { ctx } = mockCtx([
    { body: { data: [{ uid: "a" }], metadata: { nextCursor: "n1" } } },
    { body: { data: [], metadata: {} } },
  ]);
  const c = new PodiumClient(ctx);
  assertEquals(await c.list("/x"), { items: [{ uid: "a" }], nextCursor: "n1" });
  assertEquals(await c.list("/x"), { items: [], nextCursor: null });
});

Deno.test("client: arrays become key[]=v, deepObjects key[sub]=v, empties are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new PodiumClient(ctx).list("/x", {
    query: {
      searchFields: ["name", "phone"],
      createdAt: { gte: "2026-01-01T00:00:00Z", lte: undefined },
      limit: 5,
      flag: false,
      blank: "",
      none: undefined,
    },
  });
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, `${API}/x`);
  assertEquals(u.searchParams.getAll("searchFields[]"), ["name", "phone"]);
  assertEquals(u.searchParams.get("createdAt[gte]"), "2026-01-01T00:00:00Z");
  assertEquals(u.searchParams.get("limit"), "5");
  assertEquals(u.searchParams.get("flag"), "false");
  assertEquals([...u.searchParams.keys()].length, 5);
});

Deno.test("client: an error body's vendor code and message are surfaced, not just the status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", message: "ID token has invalid signature" },
  }]);
  const err = await assertRejects(() => new PodiumClient(ctx).one("/x"), Error);
  assertEquals(err.message, "Podium GET /v4/x -> 401 unauthorized: ID token has invalid signature");
});

Deno.test("client: a non-JSON error body is truncated, never dumped whole", () => {
  const msg = formatPodiumError(502, "GET", "/v4/x", "<html>" + "x".repeat(2000));
  assertEquals(msg.startsWith("Podium GET /v4/x -> 502 <html>"), true);
  assertEquals(msg.length < 520, true);
});

Deno.test("client: an empty 2xx body yields an empty object; a non-JSON 2xx body throws", async () => {
  const { ctx } = mockCtx([{ status: 202 }, { status: 200, body: "<html>" }]);
  const c = new PodiumClient(ctx);
  assertEquals(await c.one("/x"), {});
  await assertRejects(() => c.one("/x"), Error, "non-JSON");
});

Deno.test("client: redact removes the named fields from one() and from every list item", async () => {
  const { ctx } = mockCtx([
    { body: { data: { uid: "1", secret: "s" } } },
    { body: { data: [{ uid: "1", secret: "s" }, { uid: "2" }] } },
  ]);
  const c = new PodiumClient(ctx);
  assertEquals(await c.one("/x", { redact: ["secret"] }), { uid: "1" });
  assertEquals((await c.list("/x", { redact: ["secret"] })).items, [{ uid: "1" }, { uid: "2" }]);
});

Deno.test("client: a body is sent as JSON with the content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new PodiumClient(ctx).one("/x", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("helpers: toList, compact, range, encodeId, JSON params", () => {
  assertEquals(toList(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(["x", " "]), ["x"]);
  assertEquals(toList(""), undefined);
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: false }), { a: 1, e: false });
  assertEquals(range("f", undefined), { gte: "f" });
  assertEquals(range(undefined, undefined), undefined);
  assertEquals(encodeId(" +1555 "), "%2B1555");
  assertEquals(encodeId("a@b.co"), "a%40b.co");
  assertEquals(asOptionalJson('{"a":1}', "X"), { a: 1 });
  assertEquals(asOptionalJson("", "X"), undefined);
  assertEquals(asJson([1], "X"), [1]);
});

Deno.test("helpers: a required JSON param that is missing or malformed throws", () => {
  let msg = "";
  try {
    asJson(undefined, "Event");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg, "Event is required");
  try {
    asJson("{", "Event");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg, "Event is not valid JSON");
});
