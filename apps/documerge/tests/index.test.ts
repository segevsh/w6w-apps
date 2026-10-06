import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import apiToken, { classifyTokenAnswer } from "../auth/api-token.ts";
import api from "../health/api.ts";
import service from "../health/service.ts";
import { mockCtx } from "./_helpers.ts";

const pkg = JSON.parse(Deno.readTextFileSync(new URL("../package.json", import.meta.url)));

Deno.test("index: exposes 36 uniquely-keyed kebab-case actions", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 36);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z]+(-[a-z]+)*$/.test(k), k);
});

Deno.test("index: every action has a test file", () => {
  for (const a of app.actions) {
    Deno.statSync(new URL(`./actions/${a.key}.test.ts`, import.meta.url));
  }
});

Deno.test("index: perform actions state their idempotency, reads do not", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
    else assertEquals(a.idempotent, undefined, a.key);
  }
});

Deno.test("index: one bearer auth method, two health checks", () => {
  assertEquals(app.auth?.map((a) => a.key), ["api-token"]);
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["api", "service"]);
});

Deno.test("index: package.json declares only app.documerge.ai and a valid identity", () => {
  assertEquals(pkg.w6w.network.allow, ["app.documerge.ai"]);
  assert(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(pkg.w6w.id));
  assert(pkg.w6w.categories.length >= 1 && pkg.w6w.categories.length <= 3);
});

Deno.test("index: no action or lib file reads a credential or calls global fetch", () => {
  for (const dir of ["actions", "lib", "health"]) {
    for (const f of Deno.readDirSync(new URL(`../${dir}/`, import.meta.url))) {
      const src = Deno.readTextFileSync(new URL(`../${dir}/${f.name}`, import.meta.url));
      assert(!/\bauthorization\b/i.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), f.name);
      assert(!/(^|[^.\w])fetch\(/.test(src), `${f.name} calls global fetch`);
    }
  }
});

Deno.test("auth: sign stamps the bearer token", async () => {
  const req = {
    url: "https://app.documerge.ai/api/documents",
    method: "GET",
    headers: {},
  } as never;
  const out = await apiToken.sign!(
    { request: req, credential: { apiToken: "tok" } } as never,
    mockCtx().ctx,
  );
  assertEquals((out as { headers: Record<string, string> }).headers["authorization"], "Bearer tok");
});

Deno.test("auth: test accepts a documented success body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  assertEquals(await apiToken.test!({ credential: { apiToken: "tok" } } as never, ctx), {
    ok: true,
  });
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
  assertEquals(new URL(calls[0].url).pathname, "/api/documents");
});

Deno.test("auth: test rejects Unauthenticated. from the body, whatever the status", async () => {
  for (const status of [401, 403, 500]) {
    const { ctx } = mockCtx([{ status, body: { message: "Unauthenticated." } }]);
    const r = await apiToken.test!({ credential: { apiToken: "bad" } } as never, ctx);
    assertEquals(r.ok, false);
    assert(r.message!.includes("Unauthenticated"), r.message);
  }
});

Deno.test("auth: a 200 without the data envelope is not a pass", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const r = await apiToken.test!({ credential: { apiToken: "tok" } } as never, ctx);
  assertEquals(r.ok, false);
});

Deno.test("auth: test with no token makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await apiToken.test!({ credential: {} } as never, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth: classify reads 429 and other answers", () => {
  assertEquals(classifyTokenAnswer(429, "{}").kind, "rate-limited");
  assertEquals(classifyTokenAnswer(500, "boom").kind, "other");
});

Deno.test("health api: sends no credential and passes on the documented 401", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  const r = await api.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(api.credential, "none");
});

Deno.test("health api: 5xx is down, HTML is degraded, 429 is degraded, odd body is unknown", async () => {
  assertEquals(
    (await api.check!({} as never, mockCtx([{ status: 503, body: "x" }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await api.check!({} as never, mockCtx([{ body: "<html></html>" }]).ctx)).state,
    "degraded",
  );
  assertEquals(
    (await api.check!({} as never, mockCtx([{ status: 429, body: {} }]).ctx)).state,
    "degraded",
  );
  assertEquals(
    (await api.check!({} as never, mockCtx([{ status: 404, body: "nope" }]).ctx)).state,
    "unknown",
  );
});

Deno.test("health api: a transport failure is down", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("dns")), log: () => {} } as never;
  assertEquals((await api.check!({} as never, ctx)).state, "down");
});

Deno.test("health service: declared unavailable at informational severity", () => {
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason);
});
