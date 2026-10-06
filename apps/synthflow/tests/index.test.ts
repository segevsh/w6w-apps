import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}
const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: 26 actions, one auth method, two health checks", () => {
  assertEquals(app.actions.length, 26);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: keys are unique kebab-case; every action has a description and execute", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), a.key);
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assertEquals(typeof a.execute, "function");
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}/${p.key}`);
  }
});

Deno.test("index: perform actions declare idempotency honestly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (const k of ["call-make", "batch-call-create", "contact-create", "chat-send-message"]) {
    assertEquals(app.actions.find((a) => a.key === k)?.idempotent, false, k);
  }
  for (const k of ["assistant-delete", "contact-delete", "contact-update", "batch-call-cancel"]) {
    assertEquals(app.actions.find((a) => a.key === k)?.idempotent, true, k);
  }
});

Deno.test("index: no action touches credentials, global fetch, Deno.* or a host literal", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential|authorization|apiKey/i.test(src), `${a.key}: credential`);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: Deno.*`);
    assert(!/synthflow\.ai|https?:\/\//.test(src), `${a.key}: host literal`);
  }
});

Deno.test("index: connection identity is not an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|token|region)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(!banned.test(p.key), `${a.key}/${p.key}`);
  }
});

Deno.test("index: credential fields are secret; auth has sign and test", () => {
  const [m] = app.auth;
  assertEquals(m.type, "bearer");
  assertEquals(m.fields!.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(typeof m.sign, "function");
  assertEquals(typeof m.test, "function");
});

Deno.test("index: unavailable health checks are informational; widening checks are unsigned", () => {
  for (const h of app.healthChecks) {
    assert((typeof h.check === "function") !== (typeof h.unavailable?.reason === "string"), h.key);
    if (h.unavailable) assertEquals(h.severity, "informational");
    if (h.network?.allow?.length) assertEquals(h.credential, "none");
  }
});

Deno.test("index: the manifest allows exactly the three API hosts", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] } } };
  assertEquals(manifest.w6w.id, "io.w6w.synthflow");
  assertEquals(
    [...manifest.w6w.network.allow].sort(),
    ["api.eu.synthflow.ai", "api.synthflow.ai", "api.us.synthflow.ai"],
  );
});
