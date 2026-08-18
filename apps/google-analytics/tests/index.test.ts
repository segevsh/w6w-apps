import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

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

Deno.test("index: exports 23 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 23);
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
  // OAuth is the only interactive auth path Google offers for these APIs.
  assertEquals((app.auth ?? []).map((a) => a.key), ["oauth2"]);
  assertEquals((app.healthChecks ?? []).map((c) => c.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest allowlists both API hosts and not the generic Google one", () => {
  assertEquals(manifest.w6w.id, "io.w6w.google-analytics");
  assertEquals(manifest.w6w.network.allow, [
    "analyticsdata.googleapis.com",
    "analyticsadmin.googleapis.com",
  ]);
  // `www.googleapis.com` is the scope URN namespace, never fetched — allowing
  // it would widen the sandbox to every Google service.
  assert(!manifest.w6w.network.allow.includes("www.googleapis.com"));
  // The status host belongs to the service check's own allowlist.
  assert(!manifest.w6w.network.allow.includes("ads.google.com"));
  assertEquals(manifest.w6w.categories, ["analytics", "marketing"]);
});

Deno.test("index: the icon is the vendor's mark, in the vendor's colour", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Google Analytics</title>"), "the mark no longer names the app");
  assert(svg.includes("M22.84 2.9982v17.9987"), "the vendor's geometry changed");
  assert(svg.includes('fill="#E37400"'), "the mark lost Google Analytics' orange");
  // The orange reads on both tiles, so unlike Sentry/Vercel/Confluence this
  // app needs no reversed variant.
  assertEquals(manifest.w6w.appearance.darkMode, undefined);
});

/**
 * GA4 is two APIs and an action must not reach for the wrong one. `data()` is
 * reporting, `admin()` is configuration — and `access-report-run` is the one
 * report that lives on the Admin API, which is exactly the kind of thing a
 * later edit gets wrong.
 */
Deno.test("index: each action uses the API host its endpoint actually lives on", async () => {
  const dataActions = new Set([
    "report-run",
    "report-run-realtime",
    "report-run-pivot",
    "report-batch-run",
    "metadata-get",
    "compatibility-check",
    "audience-export-create",
    "audience-export-list",
    "audience-export-query",
  ]);
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const key = entry.name.replace(/\.ts$/, "");
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    // `adminAll` / the paginating helpers count too.
    const usesData = /\.data(All)?[<(]/.test(src);
    const usesAdmin = /\.admin(All)?[<(]/.test(src);
    if (dataActions.has(key)) {
      assert(usesData && !usesAdmin, `${key} should call the Data API only`);
    } else {
      assert(usesAdmin && !usesData, `${key} should call the Admin API only`);
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
