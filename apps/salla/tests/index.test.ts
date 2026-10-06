import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 31;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action declares a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(typeof a.description === "string" && a.description.length > 0, `${a.key}: description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/** Creating a record, or appending a history note, has a side effect per call. */
Deno.test("index: every create action and the order note are idempotent: false", () => {
  for (
    const key of [
      "product-create",
      "customer-create",
      "category-create",
      "coupon-create",
      "order-history-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: update, status-change and delete actions are idempotent: true", () => {
  for (
    const key of [
      "product-update",
      "product-delete",
      "product-change-status",
      "order-status-update",
      "customer-update",
      "customer-delete",
      "category-update",
      "category-delete",
      "coupon-update",
      "coupon-delete",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: every param has a key and a label, and every select has options", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
      if (p.type === "select") {
        assert(
          (p.options as unknown[] | undefined)?.length,
          `${a.key}/${p.key}: select w/o options`,
        );
      }
    }
  }
});

/** Strip comments so the sandbox guards below scan CODE, not prose. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
  }
});

Deno.test("index: no action calls global fetch, touches Deno.* or hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
    assert(!/salla\.(dev|sa)/.test(src), `${a.key}: contains a Salla host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned =
    /^(host|origin|domain|base_?url|api_?key|api_?token|token|client_?secret|access_?token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: every list action offers page, and per_page where Salla paginates", () => {
  for (const a of app.actions.filter((a) => a.key.endsWith("-list"))) {
    if (a.key === "order-status-list") continue;
    assert(a.params?.some((p) => p.key === "page"), `${a.key}: no page`);
  }
});

Deno.test("index: every create/update action offers the additionalFields escape hatch", () => {
  for (
    const a of app.actions.filter((a) =>
      /-(create|update)$/.test(a.key) &&
      !["order-history-create", "order-status-update"].includes(a.key)
    )
  ) {
    assertEquals(
      a.params?.find((p) => p.key === "additionalFields")?.type,
      "json",
      `${a.key}: no additionalFields`,
    );
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the OAuth method is wired with Salla's documented endpoints", () => {
  const [method] = app.auth;
  assertEquals(method.key, "oauth2");
  assertEquals(method.type, "oauth2");
  assertEquals(method.oauth2?.authorizationUrl, "https://accounts.salla.sa/oauth2/auth");
  assertEquals(method.oauth2?.tokenUrl, "https://accounts.salla.sa/oauth2/token");
  assert(method.oauth2?.scopes?.includes("offline_access"), "no refresh token without it");
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    if (hasUnavailable) assertEquals(h.severity, "informational", `${h.key}: severity`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) assertEquals(h.credential, "none", `${h.key}: widens egress signed`);
});
