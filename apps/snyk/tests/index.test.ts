import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { DEFAULT_VERSION } from "../lib/client.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { svg: string }; darkMode?: unknown };
  };
};

Deno.test("index: exports 20 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 20);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  const validTypes = new Set(["read", "search", "perform", "control"]);
  for (const action of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), `bad key: ${action.key}`);
    assert(validTypes.has(action.type), `bad type on ${action.key}`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key} missing idempotent flag`);
    }
  }
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["api-token"]);
  assertEquals(
    (app.healthChecks ?? []).map((c) => c.key).sort(),
    ["api-version", "quota", "service"],
  );
});

Deno.test("index: the manifest allowlists exactly the one API host", () => {
  assertEquals(manifest.w6w.id, "io.w6w.snyk");
  assertEquals(manifest.w6w.network.allow, ["api.snyk.io"]);
  // The status host belongs to the service check's own allowlist.
  assert(!manifest.w6w.network.allow.includes("status.snyk.io"));
  assertEquals(manifest.w6w.categories, ["security", "developer-tools"]);
});

/**
 * The pinned version is the app's contract with Snyk: a date, never "latest",
 * and never assembled per action. Every response shape declared here was read
 * from that version's document.
 */
Deno.test("index: the pinned version is a real date, not a moving target", () => {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(DEFAULT_VERSION), DEFAULT_VERSION);
  assert(!/latest|beta|experimental/.test(DEFAULT_VERSION), DEFAULT_VERSION);
});

/** The version is stamped in one place, so no action may set it itself. */
Deno.test("index: no action sets the version parameter by hand", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/version:\s/.test(src), `${entry.name} sets version itself — the client does that`);
  }
});

Deno.test("index: the icon is the vendor's mark, in the vendor's colour", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Snyk</title>"), "the mark no longer names Snyk");
  assert(svg.includes('fill="#4C4A73"'), "the mark lost Snyk's brand colour");
  // The mark clears both tiles, so no reversed variant is needed.
  assertEquals(manifest.w6w.appearance.darkMode, undefined);
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
