import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 31;

Deno.test("index: exports actions, one apiKey auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].type, "apiKey");
  assertEquals(app.auth[0].apiKey, { in: "header", name: "apiKey" });
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique, kebab-case and has an action test file", async () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
    await Deno.stat(new URL(`./actions/${key}.test.ts`, import.meta.url));
  }
});

Deno.test("index: every action has a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; creates and sends are false", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
    if (/-create$|-resend$|check-/.test(a.key)) assertEquals(a.idempotent, false, a.key);
    if (/-delete$/.test(a.key)) assertEquals(a.idempotent, true, a.key);
  }
});

Deno.test("index: every search action requires the product except form-list", () => {
  for (const a of app.actions.filter((a) => /-search$/.test(a.key))) {
    assert(a.params!.find((p) => p.key === "product")?.required, `${a.key}: product`);
  }
});

Deno.test("index: service and quota health checks differ as declared", () => {
  const service = app.healthChecks.find((c) => c.key === "service")!;
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason);
  assertEquals(service.check, undefined);
  const quota = app.healthChecks.find((c) => c.key === "quota")!;
  assertEquals(quota.severity, "informational");
  assertEquals(quota.credential, "signed");
});

Deno.test("index: the manifest allows only api.webconnex.com", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["api.webconnex.com"]);
});

Deno.test("index: no action carries credentials or uses global fetch", async () => {
  for (const dir of ["actions", "lib"]) {
    for (const f of Deno.readDirSync(new URL(`../${dir}/`, import.meta.url))) {
      const src = await Deno.readTextFile(new URL(`../${dir}/${f.name}`, import.meta.url));
      if (dir === "actions") assert(!/authorization|apikey/i.test(src), `${f.name}: credential`);
      assert(!/[^.\w]fetch\(/.test(src), `${dir}/${f.name}: global fetch`);
    }
  }
});
