import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const PKG = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));

Deno.test("index: one api-keys auth method and three health checks", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-keys");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: 28 unique kebab-case actions with a valid type and an execute hook", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 28);
  assertEquals(new Set(keys).size, keys.length);
  for (const action of app.actions) {
    assert(/^[a-z][a-z0-9-]*$/.test(action.key), action.key);
    assertEquals(["read", "search", "perform"].includes(action.type), true);
    assertEquals(typeof action.execute, "function");
    assertEquals(typeof action.title, "string");
  }
});

Deno.test("index: every action key has a source file and a test file", async () => {
  for (const key of app.actions.map((a) => a.key)) {
    await Deno.stat(new URL(`../actions/${key}.ts`, import.meta.url));
    await Deno.stat(new URL(`./actions/${key}.test.ts`, import.meta.url));
  }
});

Deno.test("index: no action or lib source touches a credential or global fetch", async () => {
  const files = [...Deno.readDirSync(new URL("../actions", import.meta.url))].map((e) =>
    `../actions/${e.name}`
  );
  files.push("../lib/client.ts", "../lib/mail.ts");
  for (const f of files) {
    const src = await Deno.readTextFile(new URL(f, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assertEquals(/authorization|bearer|x-api-key|sendingKey|accountKey/i.test(code), false, f);
    assertEquals(/(^|[^.\w])fetch\(/.test(code), false, f);
  }
});

Deno.test("index: network.allow lists exactly the two hosts the app calls", () => {
  assertEquals([...PKG.w6w.network.allow].sort(), ["api.maileroo.com", "smtp.maileroo.com"]);
});

Deno.test("index: applications actions never map the SMTP password or sending key", () => {
  for (const key of ["list-applications", "get-application"]) {
    const a = app.actions.find((x) => x.key === key)!;
    const names = (a.output as Array<{ key: string }>).map((o) => o.key.toLowerCase());
    assertEquals(names.some((n) => n.includes("password") || n.includes("sendingkey")), false);
  }
});

Deno.test("index: service is a declared absence at informational severity, the rest are live", () => {
  const [service, api, quota] = app.healthChecks!;
  assert(service.unavailable);
  assertEquals(service.severity, "informational");
  assert(!api.unavailable && !quota.unavailable);
});
