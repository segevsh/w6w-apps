import { test } from "node:test";
import { readFileSync } from "node:fs";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/automation-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

const call = (
  body: unknown,
  over: {
    method?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    rawBody?: string;
  } = {},
) => ({
  raw: {
    method: over.method ?? "POST",
    path: "/",
    query: over.query ?? {},
    headers: over.headers ?? { "content-type": "application/json" },
    body,
    ...(over.rawBody === undefined ? {} : { rawBody: over.rawBody }),
  },
  params: {},
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const run = (input: ReturnType<typeof call>) => trigger.handleIngest!(input, mockCtx().ctx);

test("app declares the webhook trigger with output and sample, no poll, no secret param", () => {
  assertEquals(app.triggers!.map((t) => t.key), ["automation-event"]);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(trigger.poll, undefined);
  assertEquals(typeof trigger.onSubscribe, "function");
  assertEquals(typeof trigger.onUnsubscribe, "function");
  assert(!(trigger.params ?? []).some((p) => p.type === "secret"));
});

test("a JSON object body from a rest_command POST is delivered whole", async () => {
  const payload = { event: "front_door_opened", entity_id: "binary_sensor.front_door", n: 3 };
  const out = evs(await run(call(payload))) as Array<Record<string, unknown>>;
  assertEquals(out, [{
    method: "POST",
    contentType: "application/json",
    query: {},
    data: payload,
    text: null,
  }]);
});

test("a JSON text body (host left it a string) is parsed", async () => {
  const out = evs(await run(call('{ "a" :  1 }'))) as Array<Record<string, unknown>>;
  assertEquals(out[0].data, { a: 1 });
});

test("a form-encoded body (rest_command's content_type) becomes fields", async () => {
  const out = evs(
    await run(call("mode=songs&room=kitchen", {
      method: "PUT",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
    })),
  ) as Array<Record<string, unknown>>;
  assertEquals(out[0].method, "PUT");
  assertEquals(out[0].contentType, "application/x-www-form-urlencoded");
  assertEquals(out[0].data, { mode: "songs", room: "kitchen" });
  assertEquals(out[0].text, null);
});

test("plain text, a JSON array and an empty body are kept without loss", async () => {
  const text =
    (await run(call("door is open", { headers: { "content-type": "text/plain" } }))) as unknown[];
  assertEquals((text[0] as Record<string, unknown>).text, "door is open");
  assertEquals((text[0] as Record<string, unknown>).data, null);
  const arr = (await run(call([1, 2]))) as unknown[];
  assertEquals((arr[0] as Record<string, unknown>).text, "[1,2]");
  const empty = (await run(call(null, { headers: {} }))) as unknown[];
  assertEquals(empty[0], { method: "POST", contentType: null, query: {}, data: null, text: null });
});

test("a GET carries its query string; the raw body is the fallback when body is empty", async () => {
  const get =
    (await run(call(null, { method: "get", query: { sensor: "door" }, headers: {} }))) as unknown[];
  assertEquals((get[0] as Record<string, unknown>).method, "GET");
  assertEquals((get[0] as Record<string, unknown>).query, { sensor: "door" });
  const raw = (await run(call(undefined, { rawBody: '{ "x" : 1 }' }))) as unknown[];
  assertEquals((raw[0] as Record<string, unknown>).data, { x: 1 });
});

test("request headers (which may carry credentials) are not copied into the event", async () => {
  const out = JSON.stringify(
    await run(
      call({ a: 1 }, {
        headers: { "content-type": "application/json", authorization: "Bearer test-token-value" },
      }),
    ),
  );
  assert(!out.includes("test-token-value") && !out.toLowerCase().includes("authorization"));
});

test("methods rest_command does not offer are refused", async () => {
  await assertRejects(async () => await run(call({}, { method: "TRACE" })), Error, "rest_command");
});

test("onSubscribe hands back the callback URL and makes no Home Assistant call", async () => {
  const { ctx, calls } = mockCtx([]);
  const state = await trigger.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await trigger.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});

test("README states that Home Assistant does not sign and the callback URL is the secret", () => {
  const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
  assert(readme.includes("Home Assistant does not sign these calls"));
  assert(readme.includes("callback URL is the secret"));
});
