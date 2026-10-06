import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 25 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 25);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "personal-access-token");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "site", "quota"]);
});

Deno.test("index: action keys are unique kebab-case with a description and execute hook", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `not kebab-case: ${a.key}`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; the creating ones are not", () => {
  const by = Object.fromEntries(app.actions.map((a) => [a.key, a]));
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  for (const k of ["post-message", "send-message", "create-channel", "create-group"]) {
    assertEquals(by[k].idempotent, false, k);
  }
  assertEquals(by["react-to-message"].idempotent, true);
});

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

Deno.test("index: no action touches a credential, global fetch, Deno.* or a literal host", async () => {
  for (const a of app.actions) {
    const src = strip(await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url)));
    assert(!/credential|authorization|x-auth-token|x-user-id/i.test(src), `${a.key}: auth`);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: Deno.*`);
    assert(!/https?:\/\//.test(src) && !/rocket\.chat/.test(src), `${a.key}: literal host`);
  }
});

Deno.test("index: no action exposes the deprecated unsafe `query` / `fields` params", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.key !== "query" && p.key !== "fields", `${a.key}: exposes ${p.key}`);
    }
  }
});

Deno.test("index: every param has a key and label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}/${p.key}`);
  }
});

Deno.test("index: the manifest declares communication and the *.rocket.chat wildcard only", async () => {
  const m = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url))) as {
    w6w: { id: string; categories: string[]; network: { allow: string[] } };
  };
  assertEquals(m.w6w.id, "io.w6w.rocketchat");
  assertEquals(m.w6w.categories, ["communication"]);
  assertEquals(m.w6w.network.allow, ["*.rocket.chat"]);
});
