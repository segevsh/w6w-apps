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
    assert(Array.isArray(a.params), `${a.key}: no params array`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
  }
});

Deno.test("index: no source file calls global fetch or touches Deno.*", async () => {
  for (
    const dir of ["actions", "auth", "health", "lib"] as const
  ) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.name.endsWith(".ts")) continue;
      const src = await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url));
      const stripped = src.replace(/\/\*\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert(
        !/(^|[^.\w])fetch\s*\(/.test(stripped),
        `${dir}/${entry.name}: calls global fetch — use ctx.fetch`,
      );
      assert(!/\bDeno\./.test(stripped), `${dir}/${entry.name}: touches Deno.*`);
    }
  }
});

Deno.test("index: every action targets the one allowlisted host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { network: { allow: string[] } } };
  assertEquals(manifest.w6w.network.allow, ["api.lemlist.com"]);
});

Deno.test("index: the status host is NOT on the app-wide egress allowlist", async () => {
  // A signed request must never reach a third-party status host — the service
  // check widens egress for its own unsigned hook only.
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { network: { allow: string[] } } };
  assert(!manifest.w6w.network.allow.includes("status.lempire.com"));
});

Deno.test("index: actions are grouped by resource and every one declares its resource", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  assertEquals(
    [...resources].sort(),
    ["activity", "campaign", "lead", "schedule", "team", "unsubscribe"],
  );
});
