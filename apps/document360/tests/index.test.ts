import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 37;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
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

/** Creating and forking mint a new row on every call, so a retry would duplicate. */
Deno.test("index: no create or fork action is marked idempotent", () => {
  for (const key of ["article-create", "category-create", "drive-folder-create", "article-fork"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: every action's params have unique keys", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
  }
});

Deno.test("index: every project-scoped action exposes the optional projectId override", () => {
  for (const a of app.actions.filter((a) => a.key !== "project-list")) {
    const p = (a.params ?? []).find((p) => p.key === "projectId");
    assert(p, `${a.key}: no projectId param`);
    assert(!p.required, `${a.key}: projectId must be optional`);
  }
});

Deno.test("index: the manifest allows exactly the three documented API hosts", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, [
    "apihub.document360.io",
    "apihub.us.document360.io",
    "apihub.ca.document360.io",
  ]);
});

Deno.test("index: health checks are shaped as the pack requires", () => {
  const [service, api, quota] = app.healthChecks;
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.check, undefined);
  assertEquals(api.kind, "dependency");
  assertEquals(api.credential, "context");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential, "signed");
});
