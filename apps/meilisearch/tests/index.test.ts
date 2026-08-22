import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; appearance: { darkMode?: unknown } };
};

Deno.test("index: exports 24 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 24);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "perform", "trigger"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/**
 * Every write returns a task. Each writing action must say so in its output,
 * or the whole point is lost on whoever wires it to a next step.
 */
Deno.test("index: every write returns a task, and says the status is only enqueued", () => {
  const writes = app.actions.filter((a) => a.type === "perform");
  assert(writes.length >= 9, `expected the writes to be found, got ${writes.length}`);
  for (const a of writes) {
    const outputs = a.output as Array<{ key: string; label: string }>;
    const status = outputs.find((o) => o.key === "status");
    assert(status, `${a.key} does not return a task status`);
    assert(
      status!.label.includes("Always `enqueued`"),
      `${a.key}'s status label does not warn that it is only enqueued`,
    );
  }
});

/** Three actions destroy something no later call restores. */
Deno.test("index: the destructive actions are gated behind a confirmation", () => {
  for (const key of ["documents-clear", "index-delete", "settings-reset"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const confirm = (action.params as Array<{ key: string; required?: boolean }>)
      .find((p) => p.key === "confirm");
    assert(confirm, `${key} has no confirmation flag`);
    assertEquals(confirm!.required, true);
  }
});

/**
 * The three actions that can destroy an index's contents must not resolve a
 * blank field to the connection's default.
 */
Deno.test("index: the destructive actions never default their index", async () => {
  for (const name of ["documents-clear.ts", "index-delete.ts", "settings-reset.ts"]) {
    const src = await Deno.readTextFile(new URL(`../actions/${name}`, import.meta.url));
    const body = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert(!body.includes("resolveIndex"), `${name} must require an explicit index`);
  }
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["instance", "service"]);
});

/**
 * A self-hostable app cannot name its hosts. The wide allowlist is the price,
 * and it matches the posture the pack already uses for mattermost and friends.
 */
Deno.test("index: the manifest is honest about being self-hostable", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.meilisearch");
});

Deno.test("index: the icon is the vendor's mark, in the vendor's colour", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Meilisearch</title>"), "the mark no longer names Meilisearch");
  assert(svg.includes("#FF5CAA"), "the mark lost Meilisearch's pink");
  assertEquals(manifest.w6w.appearance.darkMode, undefined);
});

/**
 * The spec names the search body's fields in snake_case and the same fields in
 * camelCase on the GET form. camelCase is what the engine takes, so no action
 * may send the generator's spelling.
 */
Deno.test("index: no action sends the spec's snake_case search fields", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const body = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const wrong of ["attributes_to_retrieve", "hits_per_page", "matching_strategy"]) {
      assert(!body.includes(wrong), `${entry.name} sends the spec's ${wrong}`);
    }
  }
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

Deno.test("index: no action reaches the network except through ctx.fetch", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(
      !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
      `${entry.name} calls global fetch`,
    );
    assert(!/\bDeno\./.test(src), `${entry.name} touches Deno.*`);
  }
});

Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
