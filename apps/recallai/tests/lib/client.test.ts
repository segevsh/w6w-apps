import { assertEquals, assertThrows } from "@std/assert";
import {
  API_URLS,
  buildQuery,
  compact,
  errorText,
  jsonObject,
  jsonValue,
  nextToken,
  RecallClient,
  redactCalendar,
  regionFrom,
  seg,
} from "../../lib/client.ts";
import { botBody, recordingConfig } from "../../lib/bot.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("regions: four canonical hosts; an unknown or missing region falls back to us-west-2", () => {
  assertEquals(Object.keys(API_URLS), [
    "us-east-1",
    "us-west-2",
    "eu-central-1",
    "ap-northeast-1",
  ]);
  // deno-lint-ignore no-explicit-any
  const conn = (region: unknown) => ({ display: { region } }) as any;
  assertEquals(regionFrom(conn("eu-central-1")), "eu-central-1");
  assertEquals(regionFrom(conn("api.recall.ai")), "us-west-2");
  assertEquals(regionFrom(conn("__proto__")), "us-west-2");
  assertEquals(regionFrom(undefined), "us-west-2");
});

Deno.test("helpers: seg, buildQuery, compact, jsonValue, jsonObject, errorText, nextToken", () => {
  assertEquals(seg("a/b c"), "a%2Fb%20c");
  assertEquals(buildQuery({ a: 1, b: "", c: undefined, d: null, e: false }), "?a=1&e=false");
  assertEquals(buildQuery(undefined), "");
  assertEquals(compact({ a: 1, b: undefined, c: "" }), { a: 1 });
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("not json"), "not json");
  assertEquals(jsonValue("  "), undefined);
  assertEquals(jsonObject("[1]"), undefined);
  assertEquals(jsonObject('{"a":1}'), { a: 1 });
  assertEquals(errorText({ code: "x", detail: "boom" }), "boom (x)");
  assertEquals(errorText({ meeting_url: ["bad"] }), '{"meeting_url":["bad"]}');
  assertEquals(errorText(null, "  plain  "), "plain");
  assertEquals(nextToken("https://x/y/?cursor=C&z=1", "cursor"), "C");
  assertEquals(nextToken("https://x/y/?page=3", "page"), "3");
  assertEquals(nextToken(null, "cursor"), undefined);
  assertEquals(nextToken("not a url", "cursor"), undefined);
});

Deno.test("client: a GET never carries a body (Recall's WAF 403s one), a POST does", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const c = new RecallClient(ctx);
  await c.request("GET", "/api/v1/bot/", { body: {} });
  await c.request("POST", "/api/v1/bot/", { body: { a: 1 } });
  assertEquals(calls[0].body, null);
  assertEquals("content-type" in calls[0].headers, false);
  assertEquals(calls[1].body, '{"a":1}');
  assertEquals(calls[1].headers["content-type"], "application/json");
});

Deno.test("client: the idempotency key is sent only when asked for and one exists", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const withInv = { ...ctx, invocation: { invocationId: "inv" } } as never;
  await new RecallClient(withInv).request("POST", "/p", { idempotent: true });
  await new RecallClient(withInv).request("POST", "/p");
  assertEquals(calls[0].headers["idempotency-key"], "inv");
  assertEquals("idempotency-key" in calls[1].headers, false);
});

Deno.test("client: non-JSON failure bodies are summarised and success with no body is {}", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }, { status: 204 }]);
  const c = new RecallClient(ctx);
  let msg = "";
  try {
    await c.request("GET", "/x");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg, "Recall GET /x failed: HTTP 502 — <html>bad gateway</html>");
  assertEquals(await c.request("DELETE", "/x"), {});
});

Deno.test("redactCalendar: drops the OAuth refresh token and client secret only", () => {
  assertEquals(
    redactCalendar({ id: "c", oauth_refresh_token: "r", oauth_client_secret: "s", status: "ok" }),
    { id: "c", status: "ok" },
  );
  assertThrows(() => redactCalendar(null as never));
});

Deno.test("bot body: shortcut, override, extra and metadata compose; blanks are dropped", () => {
  assertEquals(recordingConfig({}), undefined);
  assertEquals(
    recordingConfig({ transcriptProvider: "recallai_streaming", transcriptLanguage: " " }),
    { transcript: { provider: { recallai_streaming: {} } } },
  );
  assertEquals(botBody({ botName: "", joinAt: undefined, metadata: "[1]" }), {});
  assertEquals(botBody({ extra: '{"chat":{}}', botName: "N" }), { chat: {}, bot_name: "N" });
});
