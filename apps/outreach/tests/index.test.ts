import { denoReadDir, denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const pkg = JSON.parse(await denoReadTextFile(new URL("../package.json", import.meta.url)));
const dir = new URL("../actions/", import.meta.url);
const files: string[] = [];
for await (const e of denoReadDir(dir)) files.push(e.name);

test("index: exports exactly the actions on disk, unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z]+(-[a-z]+)*$/.test(k), k);
  assertEquals(keys.length, 30);
  assertEquals(files.filter((f) => !f.endsWith(".ts")).length, 0);
  assertEquals(files.length, keys.length);
  for (const k of keys) assert(files.includes(`${k}.ts`), `${k}.ts missing`);
});

test("index: every action has a type, title, description, output and unique params", () => {
  for (const a of app.actions) {
    assert(["read", "perform"].includes(a.type), a.key);
    assert(a.title && a.description, a.key);
    assert(Array.isArray(a.output) && a.output.length > 0, a.key);
    const pk = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(pk).size, pk.length, `${a.key} has duplicate param keys`);
  }
});

test("index: reads are read, writes declare idempotency honestly", () => {
  for (const a of app.actions) {
    const isRead = /-(list|get)$/.test(a.key);
    assertEquals(a.type, isRead ? "read" : "perform", a.key);
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  const idem = app.actions.filter((a) => a.idempotent).map((a) => a.key).sort();
  assertEquals(idem, ["account-update", "prospect-update"]);
});

test("index: one OAuth2 method, service + quota health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["oauth2"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

test("index: network.allow lists only the API host", () => {
  assertEquals(pkg.w6w.network.allow, ["api.outreach.io"]);
  assertEquals(pkg.w6w.id, "io.w6w.outreach");
  assertEquals(pkg.w6w.categories, ["crm", "marketing"]);
});

test("index: no action or lib source calls global fetch or sets credentials", async () => {
  const roots = [new URL("../actions/", import.meta.url), new URL("../lib/", import.meta.url)];
  for (const root of roots) {
    for await (const e of denoReadDir(root)) {
      const src = await denoReadTextFile(new URL(e.name, root));
      assert(!/(^|[^.\w])fetch\(/.test(src), `${e.name} calls global fetch`);
      if (root.pathname.endsWith("/actions/")) {
        assert(!/authorization/i.test(src), `${e.name} mentions authorization`);
      }
    }
  }
});

test("index: every secret-bearing webhook action strips secrets", async () => {
  for (const f of ["webhook-list", "webhook-create"]) {
    const src = await denoReadTextFile(new URL(`../actions/${f}.ts`, import.meta.url));
    assert(src.includes("stripWebhookSecrets"), f);
  }
});
