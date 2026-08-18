import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { url?: string; svg?: string } };
  };
};

Deno.test("index: exports 25 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 25);
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

/** Anything that moves money creates a new record on every call. */
Deno.test("index: the money-moving actions are honestly non-idempotent", () => {
  for (
    const key of ["contract-milestone-create", "invoice-adjustment-create", "timesheet-create"]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)!.idempotent, false, key);
  }
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["api-token"]);
  assertEquals((app.healthChecks ?? []).map((c) => c.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest allowlists both Deel environments", () => {
  assertEquals(manifest.w6w.id, "io.w6w.deel");
  // Tokens are not shared between them, but a Connection may point at either.
  assertEquals(manifest.w6w.network.allow, ["api.letsdeel.com", "api-staging.letsdeel.com"]);
  assertEquals(manifest.w6w.categories, ["hr", "finance"]);
});

/**
 * Deel publishes no SVG mark, so this app ships the vendor's own favicon as a
 * raster — the same treatment `tldv` and `ringcentral` use.
 */
Deno.test("index: the icon is the vendor's favicon, carried as a PNG", async () => {
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(manifest.w6w.appearance.icon.svg, undefined);
  const png = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // PNG magic — proves it is a real image and not an HTML error page saved
  // with the wrong extension.
  assertEquals(Array.from(png.slice(0, 4)), [0x89, 0x50, 0x4e, 0x47]);
  assert(png.length > 0);
});

/**
 * Two pagination contracts, and using the wrong one silently returns page one.
 * Each action must use the pager its endpoint declares.
 */
Deno.test("index: cursor and offset pagers are used where the API declares them", async () => {
  // The HRIS collections page by offset; everything else by cursor.
  const offsetActions = new Set(["person-list", "time-off-list"]);
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const key = entry.name.replace(/\.ts$/, "");
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    if (src.includes("requestAllOffset")) {
      assert(offsetActions.has(key), `${key} uses the offset pager but is not an HRIS collection`);
    }
    if (src.includes("requestAllCursor")) {
      assert(!offsetActions.has(key), `${key} should page by offset, not cursor`);
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

/**
 * Deel's spec declares `Authorization` as a parameter on several operations.
 * No action may have copied it into a form field.
 */
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
