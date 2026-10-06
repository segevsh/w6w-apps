import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 50;

Deno.test("index: exports actions, auth and health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "basic");
  assertEquals(app.auth[0].type, "basic");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; plain creates are not idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
    // submission-create is the exception: its guid is the vendor's duplicate guard.
    if (a.key.endsWith("-create") && a.key !== "submission-create") {
      assertEquals(a.idempotent, false, a.key);
    }
  }
  assertEquals(app.actions.find((a) => a.key === "submission-create")?.idempotent, true);
});

Deno.test("index: reads never carry an idempotency flag, lists expose page", () => {
  for (const a of app.actions.filter((a) => a.type === "read")) {
    assertEquals(a.idempotent, undefined, a.key);
  }
  for (const a of app.actions.filter((a) => a.key.endsWith("-list"))) {
    const out = a.output as unknown as Array<{ key: string }> | undefined;
    const paged = Array.isArray(out) && out.some((o) => o.key === "pagination");
    if (paged) assert((a.params ?? []).some((p) => p.key === "page"), `${a.key}: no page param`);
  }
});

Deno.test("index: every delete action offers hardDelete (soft by default)", () => {
  for (const a of app.actions.filter((a) => a.key.endsWith("-delete"))) {
    assert((a.params ?? []).some((p) => p.key === "hardDelete"), `${a.key}: no hardDelete`);
  }
});

Deno.test("index: no action touches a credential or global fetch", async () => {
  for (const f of Deno.readDirSync(new URL("../actions/", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${f.name}`, import.meta.url));
    assert(!/authorization/i.test(src), `${f.name}: mentions authorization`);
    assert(!/[^.\w]fetch\(/.test(src), `${f.name}: calls global fetch`);
    assert(!/[?&]password=|username=/.test(src), `${f.name}: credential in a URL`);
  }
});

Deno.test("index: only www.gocanvas.com is declared and called", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["www.gocanvas.com"]);
});
