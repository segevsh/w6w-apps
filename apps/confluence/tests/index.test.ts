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

Deno.test("index: exports 22 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 22);
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

Deno.test("index: exports both auth methods and all three health checks", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["api-token", "oauth2"]);
  assertEquals((app.healthChecks ?? []).map((c) => c.key).sort(), ["quota", "service", "site"]);
});

Deno.test("index: the manifest allows the site wildcard and the OAuth gateway", () => {
  assertEquals(manifest.w6w.id, "io.w6w.confluence");
  // No manifest can enumerate customer sites, and an OAuth connection talks to
  // the gateway instead — the same pair the jira app declares.
  assertEquals(manifest.w6w.network.allow, ["*.atlassian.net", "api.atlassian.com"]);
  // The status host belongs to the service check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("confluence.status.atlassian.com"));
  assertEquals(manifest.w6w.categories, ["documents", "productivity"]);
});

Deno.test("index: the icon is the vendor's mark, with a dark variant", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Confluence</title>"), "the mark no longer names Confluence");
  assert(svg.includes("M.87 18.257c-.248.382-.53.875-.763 1.245"), "the mark was redrawn");
  assert(svg.includes('fill="#172B4D"'), "the mark lost the Atlassian navy");

  const dark = await Deno.readTextFile(new URL("../assets/icon.dark.svg", import.meta.url));
  assert(dark.includes('fill="#ffffff"'), "the dark variant is not reversed to white");
  assertEquals(manifest.w6w.appearance.darkMode?.icon.svg, "./assets/icon.dark.svg");
});

/**
 * v2 is the app's API. The two v1 calls are deliberate and documented, and
 * this test is what keeps that list from quietly growing: v2 publishes no
 * search endpoint and no whoami, and nothing else may reach for v1.
 */
Deno.test("index: exactly two actions call v1, and they are the two v2 cannot serve", async () => {
  const allowed = new Set(["content-search", "user-current"]);
  const found = new Set<string>();
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    if (src.includes("requestV1(")) found.add(entry.name.replace(/\.ts$/, ""));
  }
  assertEquals([...found].sort(), [...allowed].sort());
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
