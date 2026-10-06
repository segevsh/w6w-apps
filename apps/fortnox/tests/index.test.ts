import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 54;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/** Creating a record, booking it, crediting it and emailing it each have a side effect per call. */
Deno.test("index: every create/bookkeep/cancel/credit/convert/email action is marked idempotent: false", () => {
  for (
    const key of [
      "customer-create",
      "supplier-create",
      "article-create",
      "invoice-create",
      "invoice-bookkeep",
      "invoice-cancel",
      "invoice-credit",
      "invoice-send-email",
      "order-create",
      "order-create-invoice",
      "offer-create",
      "offer-create-order",
      "supplier-invoice-create",
      "supplier-invoice-bookkeep",
      "voucher-create",
      "account-create",
      "invoice-payment-create",
      "project-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/** Fortnox updates are partial PUTs and deletes end in the same state, so retrying is safe. */
Deno.test("index: update and delete are marked idempotent: true", () => {
  for (
    const key of [
      "customer-update",
      "customer-delete",
      "supplier-update",
      "article-update",
      "article-delete",
      "invoice-update",
      "order-update",
      "offer-update",
      "account-update",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
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

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/** The API origin lives in `lib/client.ts` and nowhere else. */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/fortnox\.se/.test(src), `${a.key}: contains a Fortnox host literal`);
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

/** Every action's endpoint is an exact, documented `/3/…` path (the reference's `servers` host is the only host). */
Deno.test("index: every action calls a /3/ path, and none uses the retired XML or query-token forms", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(/["`]\/3\//.test(src), `${a.key}: no /3/ path`);
    assert(!/access_token=/i.test(src), `${a.key}: puts a token in the query`);
  }
});

/** Row arrays are raw JSON by design: Fortnox row schemas differ per document and carry ~20 fields. */
Deno.test("index: documents with rows expose them as json params", () => {
  for (
    const [key, param] of [
      ["invoice-create", "invoiceRows"],
      ["order-create", "orderRows"],
      ["offer-create", "offerRows"],
      ["supplier-invoice-create", "supplierInvoiceRows"],
      ["voucher-create", "voucherRows"],
    ]
  ) {
    const p = app.actions.find((a) => a.key === key)!.params?.find((x) => x.key === param);
    assert(p, `${key}: missing ${param}`);
    assertEquals(p?.type, "json", `${key}/${param}`);
  }
});

Deno.test("index: every create/update action offers the additionalFields escape hatch", () => {
  for (const a of app.actions.filter((a) => /-(create|update)$/.test(a.key))) {
    assertEquals(
      a.params?.find((p) => p.key === "additionalFields")?.type,
      "json",
      `${a.key}: no additionalFields`,
    );
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the OAuth method is wired with the documented endpoints and offline access", () => {
  const [method] = app.auth;
  assertEquals(app.auth.length, 1);
  assertEquals(method.key, "oauth2");
  assertEquals(method.type, "oauth2");
  assertEquals(method.oauth2?.authorizationUrl, "https://apps.fortnox.se/oauth-v1/auth");
  assertEquals(method.oauth2?.tokenUrl, "https://apps.fortnox.se/oauth-v1/token");
  assertEquals(method.oauth2?.extraAuthParams, { access_type: "offline" });
  assert(!JSON.stringify(method).includes("ory.sh"), "the Ory Hydra demo scheme must be ignored");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

Deno.test("index: the auth probe is /3/companyinformation", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/oauth2.ts", import.meta.url)));
  assert(src.includes("/3/companyinformation"), "auth probe no longer hits /3/companyinformation");
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  assertEquals(app.healthChecks.length, 2);
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
    if (hasUnavailable) {
      assertEquals(h.severity, "informational", `${h.key}: unavailable needs informational`);
    }
  }
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});
