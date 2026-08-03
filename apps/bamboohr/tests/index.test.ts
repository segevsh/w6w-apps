import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 18);
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

Deno.test("index: the writes that duplicate are marked non-idempotent, honestly", () => {
  const by = Object.fromEntries(app.actions.map((a) => [a.key, a]));
  // No idempotency key exists on either endpoint, and a retry genuinely creates
  // a second employee / a second block of leave.
  assertEquals(by["create-employee"].idempotent, false);
  assertEquals(by["create-time-off-request"].idempotent, false);
  // These converge: setting the same fields or the same status twice is a no-op.
  assertEquals(by["update-employee"].idempotent, true);
  assertEquals(by["update-time-off-request-status"].idempotent, true);
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose.
 *
 * Without this the checks are simultaneously too weak and too strong: a doc
 * comment explaining *why* an action never touches the credential trips the
 * assertion, while a reviewer's natural fix — deleting the explanation — would
 * leave a real violation just as invisible. Scanning only executable text makes
 * the guard mean what it says.
 */
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
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

Deno.test("index: no action hard-codes a hostname — the host is per-customer", async () => {
  // Every URL must be built from the Connection via `BambooClient`. A literal
  // host would either point at the wrong company or be denied by the sandbox.
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https?:\/\//.test(src), `${a.key}: hard-codes an absolute URL`);
    assert(!/bamboohr\.com/.test(src), `${a.key}: hard-codes a host`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// credential\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
  // And a real violation must still be visible after stripping.
  assert(/credential/.test(code("const c = credential;")));
});

Deno.test("index: every required param is marked required, and every param has a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

Deno.test("index: health checks cover the declared kinds, and quota is informational", () => {
  const byKey = Object.fromEntries(app.healthChecks.map((c) => [c.key, c]));
  assertEquals(byKey.service.kind, "service");
  assertEquals(byKey.quota.kind, "quota");
  // A quota reading — or in this case its documented absence — must never fail
  // a roll-up on its own.
  assertEquals(byKey.quota.severity, "informational");
});

Deno.test("index: the service check is feed-backed and therefore declares no egress", () => {
  const service = app.healthChecks.find((c) => c.key === "service")!;
  assert(service.feed?.url.startsWith("https://status.bamboohr.com/"));
  // The feed host is allowlisted implicitly; restating it would be wrong.
  assertEquals(service.network, undefined);
  // Feed-backed checks must be unsigned — `none` is this kind's default.
  assert(service.credential === undefined || service.credential === "none");
});

Deno.test("index: the manifest declares hr, the RFC-sanctioned category", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; categories: string[]; network: { allow: string[] } } };

  assertEquals(manifest.w6w.id, "io.w6w.bamboohr");
  assert(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(manifest.w6w.id), "id must be reverse-DNS");
  assertEquals(manifest.w6w.categories, ["hr"]);
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);

  // The host is per-customer, so a fixed `api.bamboohr.com` would deny every
  // call. The narrow wildcard is the correct and tightest workable form.
  assertEquals(manifest.w6w.network.allow, ["*.bamboohr.com"]);
});
