import { assertEquals } from "@std/assert";
import app from "../index.ts";
import { apiHost, describeError, mediaAuthBody, paginationBody } from "../lib/client.ts";
import { mockCtx } from "./_helpers.ts";
import { FellowClient } from "../lib/client.ts";

Deno.test("index: 23 actions with unique kebab-case keys, each with a valid type", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 23);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assertEquals(/^[a-z][a-z0-9-]*$/.test(a.key), true, a.key);
    assertEquals(["read", "search", "perform"].includes(a.type), true, a.key);
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
    assertEquals(typeof a.execute, "function", a.key);
  }
});

Deno.test("index: one api-key auth with sign and test; two health checks incl. an informational absence", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(typeof app.auth[0].sign, "function");
  assertEquals(typeof app.auth[0].test, "function");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "rate-limit"]);
});

Deno.test("index: no action carries a credential or its own Authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new FellowClient(ctx).request("/me");
  assertEquals(Object.keys(calls[0].headers).sort(), ["accept"]);
});

Deno.test("client: apiHost only ever yields a single label under fellow.app", () => {
  assertEquals(apiHost("Acme"), "acme.fellow.app");
  assertEquals(apiHost("acme.fellow.app"), "acme.fellow.app");
  // Whatever the input, the result is either a refusal or exactly one label under fellow.app
  // (a pasted path or query is stripped, never carried into the host).
  for (const bad of ["", "a.b", "evil.com", "a/b?x", "-a", "a_b", "a@evil.com", "a:443"]) {
    let host: string | null = null;
    try {
      host = apiHost(bad);
    } catch { /* refused */ }
    assertEquals(host === null || /^[a-z0-9-]+\.fellow\.app$/.test(host), true, bad);
  }
  for (const refused of ["", "a.b", "evil.com", "-a", "a_b", "a@evil.com"]) {
    let threw = false;
    try {
      apiHost(refused);
    } catch {
      threw = true;
    }
    assertEquals(threw, true, refused);
  }
});

Deno.test("client: a connection with no subdomain fails before any request", async () => {
  const { ctx, calls } = mockCtx([], "");
  let msg = "";
  try {
    await new FellowClient(ctx).request("/me");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("subdomain"), true);
  assertEquals(calls.length, 0);
});

Deno.test("client: pagination bounds, error formats and media auth", () => {
  assertEquals(paginationBody(), undefined);
  assertEquals(paginationBody(50, "c"), { page_size: 50, cursor: "c" });
  for (const bad of [0, 51, 1.5]) {
    let threw = false;
    try {
      paginationBody(bad);
    } catch {
      threw = true;
    }
    assertEquals(threw, true, String(bad));
  }
  assertEquals(describeError(429, '{"detail":"rate_limited"}').includes("3 requests/second"), true);
  assertEquals(describeError(404, "<!doctype html>").includes("subdomain"), true);
  assertEquals(describeError(422, '{"detail":[{"msg":"bad"}]}').includes("bad"), true);
  assertEquals(mediaAuthBody({ mediaAuthType: "none" }), undefined);
  assertEquals(
    mediaAuthBody({ mediaAuthType: "basic_auth", mediaUsername: "u", mediaPassword: "p" }),
    {
      type: "basic_auth",
      username: "u",
      password: "p",
    },
  );
});

Deno.test("client: a 204/empty success returns undefined and a non-JSON success throws", async () => {
  const empty = mockCtx([{ status: 204 }]);
  assertEquals(await new FellowClient(empty.ctx).request("/x"), undefined);
  const junk = mockCtx([{ body: "<html>", headers: { "content-type": "text/html" } }]);
  let threw = false;
  try {
    await new FellowClient(junk.ctx).request("/x");
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("actions: validation fails before a request is made", async () => {
  const byKey = Object.fromEntries(app.actions.map((a) => [a.key, a]));
  const cases: Array<[string, Record<string, unknown>]> = [
    ["note-agenda-write", { noteId: "n" }],
    ["webhook-update", { webhookId: "w" }],
    ["webhook-create", { url: "https://x.test", enabledEvents: [] }],
    ["recording-list", { pageSize: 99 }],
    ["recording-get", { recordingId: " " }],
    ["recording-upload", { url: "u", title: "t", mediaAuthType: "bearer_token" }],
  ];
  for (const [key, input] of cases) {
    const { ctx, calls } = mockCtx([]);
    let threw = false;
    try {
      await byKey[key].execute(input as never, ctx);
    } catch {
      threw = true;
    }
    assertEquals(threw, true, key);
    assertEquals(calls.length, 0, key);
  }
});
