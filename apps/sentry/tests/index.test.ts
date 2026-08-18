import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    displayName: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { svg: string } };
  };
};

Deno.test("index: exports 21 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 21);
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

Deno.test("index: exports both auth methods", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["auth-token", "oauth2"]);
});

Deno.test("index: exports the three health checks", () => {
  const keys = (app.healthChecks ?? []).map((c) => c.key).sort();
  assertEquals(keys, ["quota", "service", "site"]);
});

Deno.test("index: the manifest allows any host, because self-hosted installs have no fixed one", () => {
  assertEquals(manifest.w6w.id, "io.w6w.sentry");
  // `"*"` is the documented form for an app addressed by a user-supplied URL —
  // the same one grafana, elastic and wordpress use. Narrowing it would break
  // every self-hosted install.
  assertEquals(manifest.w6w.network.allow, ["*"]);
  // The status host belongs to the service check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.sentry.io"));
  assertEquals(manifest.w6w.categories, ["monitoring", "developer-tools"]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

/**
 * The artwork is the vendor's, unmodified — but the paint is not. simple-icons
 * ships the mark monochrome (black), which is invisible on the host's dark icon
 * tile; it now carries Sentry's own brand purple, the `hex` simple-icons
 * records for this brand.
 */
Deno.test("index: the icon is the vendor's mark, in the vendor's colour", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Sentry</title>"), "the mark no longer names Sentry");
  // The path data is untouched, and it is the thing a redraw would change.
  assert(
    svg.includes("M13.91 2.505c-.873-1.448-2.972-1.448-3.844 0"),
    "the vendor's geometry changed — the mark was redrawn",
  );
  assert(svg.includes('fill="#362D59"'), "the mark lost Sentry's brand purple");
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
