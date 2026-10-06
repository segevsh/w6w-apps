import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 25;

Deno.test("index: exports actions, one bearer auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].type, "bearer");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/** The vendor accepts no idempotency key: a retried send/create/replay places a second order. */
Deno.test("index: every send, replay and create action is non-idempotent", () => {
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (const key of app.actions.map((a) => a.key)) {
    if (/^send-|^order-replay$|-create/.test(key)) {
      assertEquals(byKey.get(key)?.idempotent, false, key);
    }
  }
});

Deno.test("index: every action that spends money says so in its description", () => {
  for (const a of app.actions.filter((a) => /^send-|^order-replay$/.test(a.key))) {
    assert(/real money/i.test(a.description ?? ""), `${a.key}: no spend warning`);
  }
});

Deno.test("index: the service check is a declared absence with informational severity", () => {
  for (const key of ["service", "quota"]) {
    const h = app.healthChecks.find((c) => c.key === key)!;
    assertEquals(h.severity, "informational", key);
    assert(h.unavailable?.reason, key);
    assertEquals(h.check, undefined, key);
  }
});

Deno.test("index: the manifest allows only api.thanks.io", async () => {
  const pkg = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  );
  assertEquals(pkg.w6w.network.allow, ["api.thanks.io"]);
});

Deno.test("index: no action carries credentials or uses global fetch", async () => {
  for (const dir of ["actions", "lib"]) {
    for (const f of Deno.readDirSync(new URL(`../${dir}/`, import.meta.url))) {
      const src = await Deno.readTextFile(new URL(`../${dir}/${f.name}`, import.meta.url));
      if (dir === "actions") {
        assert(!/authorization/i.test(src), `${dir}/${f.name}: mentions authorization`);
      }
      assert(!/[^.\w]fetch\(/.test(src), `${dir}/${f.name}: global fetch`);
    }
  }
});
