import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { svg: string }; darkMode?: { icon: { svg: string } } };
  };
};

Deno.test("index: exports 27 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 27);
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

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["oauth2"]);
  assertEquals((app.healthChecks ?? []).map((c) => c.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest allowlists exactly the one API host", () => {
  assertEquals(manifest.w6w.id, "io.w6w.miro");
  assertEquals(manifest.w6w.network.allow, ["api.miro.com"]);
  // The status host belongs to the service check's own allowlist.
  assert(!manifest.w6w.network.allow.includes("status.miro.com"));
  assertEquals(manifest.w6w.categories, ["productivity", "project-management"]);
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/**
 * Miro's spec lists several board endpoints under renamed path parameters
 * (`{board_id_PlatformTags}` and friends) — generator artifacts for paths that
 * are all `/v2/boards/{board_id}/…` on the wire. Copying a template literally
 * would produce URLs Miro does not serve, so no action may contain one.
 */
Deno.test("index: no action copied the spec's renamed path placeholders", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const url = src.replace(/\/\*[\s\S]*?\*\//g, "");
    assert(!url.includes("board_id_Platform"), `${entry.name} built a URL from a spec artifact`);
  }
});

/** Experimental paths can change without a version bump, so nothing calls one. */
Deno.test("index: no action calls a /v2-experimental path", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    // Comments are stripped first: `shape-create` documents *why* it uses the
    // stable path instead, and that explanation must not trip the guard.
    const src = code(
      await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)),
    );
    assert(!src.includes("/v2-experimental"), `${entry.name} calls an experimental endpoint`);
  }
});

Deno.test("index: the icon is the vendor's mark, with a dark variant", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Miro</title>"), "the mark no longer names Miro");
  assert(svg.includes("M17.392 0H13.9"), "the vendor's geometry changed");
  assert(svg.includes('fill="#050038"'), "the mark lost Miro's brand navy");

  const dark = await Deno.readTextFile(new URL("../assets/icon.dark.svg", import.meta.url));
  assert(dark.includes('fill="#ffffff"'), "the dark variant is not reversed to white");
  assertEquals(manifest.w6w.appearance.darkMode?.icon.svg, "./assets/icon.dark.svg");
});

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
