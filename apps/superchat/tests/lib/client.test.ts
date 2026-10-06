import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { formatError, pageQuery, seg, SuperchatClient } from "../../lib/client.ts";
import { REDACTED, redactWebhook } from "../../lib/redact.ts";
import { dropUndefined } from "../../lib/body.ts";

Deno.test("client: base URL is /v1.0 and never carries credentials", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new SuperchatClient(ctx).request("/me");
  assertEquals(calls[0].url, "https://api.superchat.com/v1.0/me");
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("client: array query values repeat the key; empty values are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SuperchatClient(ctx).request("/x", {
    query: { ids: ["a", "b"], skip: "", none: undefined, n: 0 },
  });
  assertEquals(new URL(calls[0].url).search, "?ids=a&ids=b&n=0");
});

Deno.test("client: an empty success body returns null", async () => {
  const { ctx } = mockCtx([{ status: 200, headers: {} }]);
  assertEquals(await new SuperchatClient(ctx).request("/x"), null);
});

Deno.test("client: errors name the status; auth failures with empty bodies are explained", async () => {
  for (
    const [status, text] of [[401, "no API key"], [403, "rejected"], [429, "rate limit"]] as const
  ) {
    const { ctx } = mockCtx([{ status, headers: {} }]);
    const err = await assertRejects(() => new SuperchatClient(ctx).request("/me"), Error);
    assert(err.message.includes(String(status)) && err.message.includes(text), err.message);
  }
});

Deno.test("formatError: reads the {errors:[{title,detail}]} envelope, else the raw text", () => {
  const body = JSON.stringify({
    errors: [{ title: "Bad", detail: "no handle", status_code: 400 }],
  });
  assertEquals(formatError(400, "Bad Request", body), "400 Bad: no handle");
  assertEquals(formatError(502, "Bad Gateway", "oops"), "502 Bad Gateway — oops");
});

Deno.test("client: a 200 that is not JSON throws instead of returning text", async () => {
  const { ctx } = mockCtx([{ body: "<html>", headers: {} }]);
  await assertRejects(() => new SuperchatClient(ctx).request("/x"), Error, "not JSON");
});

Deno.test("seg and pageQuery: encode ids, refuse empty ids and after+before together", () => {
  assertEquals(seg("a/b c"), "a%2Fb%20c");
  assert(seg(" x ") === "x");
  try {
    seg("  ");
    assert(false, "should have thrown");
  } catch (e) {
    assert((e as Error).message.includes("empty"));
  }
  assertEquals(pageQuery({ limit: 5 }), { limit: 5, after: undefined, before: undefined });
  try {
    pageQuery({ after: "a", before: "b" });
    assert(false, "should have thrown");
  } catch (e) {
    assert((e as Error).message.includes("only one of"));
  }
});

Deno.test("redactWebhook: blanks a present secret, leaves null/absent alone", () => {
  assertEquals(redactWebhook({ id: "w", secret: "s" }), { id: "w", secret: REDACTED });
  assertEquals(redactWebhook({ id: "w", secret: null }), { id: "w", secret: null });
  assertEquals(redactWebhook({ id: "w" }), { id: "w" });
  assertEquals(redactWebhook(null), null);
});

Deno.test("dropUndefined: removes undefined but keeps null and falsy values", () => {
  assertEquals(dropUndefined<Record<string, unknown>>({ a: undefined, b: null, c: 0, d: "" }), {
    b: null,
    c: 0,
    d: "",
  });
});
