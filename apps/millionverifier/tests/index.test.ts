import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const PKG = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));

Deno.test("index: one api-key auth method and three health checks", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: 8 unique kebab-case actions with a valid type and an execute hook", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 8);
  assertEquals(new Set(keys).size, keys.length);
  for (const action of app.actions) {
    assert(/^[a-z][a-z0-9-]*$/.test(action.key), action.key);
    assertEquals(["read", "search", "perform"].includes(action.type), true);
    assertEquals(typeof action.execute, "function");
  }
});

Deno.test("index: every action key has a source file and a test file", async () => {
  for (const key of app.actions.map((a) => a.key)) {
    await Deno.stat(new URL(`../actions/${key}.ts`, import.meta.url));
    await Deno.stat(new URL(`./actions/${key}.test.ts`, import.meta.url));
  }
});

Deno.test("index: no action source touches a credential or global fetch", async () => {
  const files = [...Deno.readDirSync(new URL("../actions", import.meta.url))].map((e) =>
    `../actions/${e.name}`
  );
  files.push("../lib/client.ts");
  for (const f of files) {
    const src = await Deno.readTextFile(new URL(f, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assertEquals(
      (f.includes("actions/") ? /authorization|bearer|apiKey/i : /authorization|bearer/i).test(
        code,
      ),
      false,
      f,
    );
    assertEquals(/(^|[^.\w])fetch\(/.test(code), false, f);
  }
});

Deno.test("index: network.allow lists exactly the two hosts the app calls", () => {
  assertEquals([...PKG.w6w.network.allow], [
    "api.millionverifier.com",
    "bulkapi.millionverifier.com",
  ]);
});

Deno.test("index: perform actions declare idempotency, the icon file exists", async () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  await Deno.stat(new URL("../assets/icon.ico", import.meta.url));
  assertEquals(PKG.w6w.appearance.icon.url, "./assets/icon.ico");
});
