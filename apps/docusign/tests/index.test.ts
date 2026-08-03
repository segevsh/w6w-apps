import { assertEquals } from "@std/assert";
import app from "../index.ts";
import manifest from "../package.json" with { type: "json" };

Deno.test("entry module exports actions, auth and health checks", () => {
  assertEquals(Array.isArray(app.actions), true);
  assertEquals(app.actions.length, 16);
  assertEquals(app.auth.map((a) => a.key), ["oauth2", "oauth2-demo"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k), true, k);
});

Deno.test("every action declares a title, description, type and output", () => {
  for (const a of app.actions) {
    assertEquals(typeof a.title, "string", a.key);
    assertEquals(typeof a.description, "string", a.key);
    assertEquals(["read", "search", "perform"].includes(a.type), true, a.key);
    assertEquals(Array.isArray(a.output), true, a.key);
  }
});

Deno.test("every perform action declares idempotency explicitly", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});

Deno.test("only envelope-void is declared idempotent", () => {
  const idempotent = app.actions.filter((a) => a.idempotent === true).map((a) => a.key);
  assertEquals(idempotent, ["envelope-void"]);
});

Deno.test("no action collects a credential — auth is the sign hook's job", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assertEquals(/token|secret|password|apikey/i.test(p.key), false, `${a.key}#${p.key}`);
    }
  }
});

Deno.test("manifest identity matches the pack's conventions", () => {
  assertEquals(manifest.w6w.id, "io.w6w.docusign");
  assertEquals(manifest.w6w.displayName, "DocuSign");
  assertEquals(manifest.w6w.categories, ["documents", "legal", "productivity"]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assertEquals(manifest.version, "0.1.0");
});

Deno.test("network.allow covers the per-account API apex and both auth hosts", () => {
  assertEquals(manifest.w6w.network.allow, [
    "*.docusign.net",
    "account.docusign.com",
    "account-d.docusign.com",
  ]);
});

Deno.test("both auth methods are oauth2 and target different environments", () => {
  const [prod, demo] = app.auth;
  assertEquals(prod.type, "oauth2");
  assertEquals(demo.type, "oauth2");
  assertEquals(prod.oauth2?.authorizationUrl, "https://account.docusign.com/oauth/auth");
  assertEquals(demo.oauth2?.authorizationUrl, "https://account-d.docusign.com/oauth/auth");
});
