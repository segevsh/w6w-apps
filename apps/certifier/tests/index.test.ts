import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 19 actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, 19);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api"]);
});

Deno.test("index: action keys are unique kebab-case with a description and execute hook", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `not kebab-case: ${a.key}`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description!.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency, and the emailing ones are not", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  const by = Object.fromEntries(app.actions.map((a) => [a.key, a]));
  assertEquals(by["credential-send"].idempotent, false);
  assertEquals(by["credential-create-issue-send"].idempotent, false);
});

Deno.test("index: no action or health check embeds a credential or a raw global fetch", async () => {
  for (const f of Deno.readDirSync(new URL("../actions", import.meta.url))) {
    const text = await Deno.readTextFile(new URL(`../actions/${f.name}`, import.meta.url));
    assert(!/authorization/i.test(text), `${f.name} mentions authorization`);
    assert(!/[^.]\bfetch\(/.test(text), `${f.name} calls global fetch`);
  }
});

Deno.test("index: the manifest allows exactly the API host", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["api.certifier.io"]);
});
