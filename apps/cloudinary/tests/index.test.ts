import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as { w6w: { id: string; categories: string[]; network: { allow: string[] } } };

Deno.test("index: exports 21 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 21);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key} declares no output`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Uploading without a public id creates a new copy every run. */
Deno.test("index: the actions that duplicate on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["asset-upload", "transformation-create"]);
});

/** Anything whose scope is unknowable in advance has to be confirmed. */
Deno.test("index: the unbounded destructive actions carry a confirmation flag", () => {
  for (const key of ["asset-delete", "asset-tag", "transformation-delete"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const confirm = (action.params as Array<{ key: string }>).find((p) => p.key === "confirm");
    assert(confirm, `${key} has no confirmation flag`);
  }
});

/**
 * Cloudinary's Search API docs give POST /search; measured 2026-08-18 that
 * 404s and /resources/search is the path that routes.
 */
Deno.test("index: search uses the path that actually routes", async () => {
  const src = await Deno.readTextFile(new URL("../actions/asset-search.ts", import.meta.url));
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert(code.includes('"/resources/search"'), "search does not call /resources/search");
});

/**
 * Signing a delivery URL needs the API secret, and only the auth `sign` hook
 * may touch a credential — so no action may reach for one.
 */
Deno.test("index: no action outside auth/ touches the api secret", async () => {
  for (const dir of ["actions", "lib", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.name.endsWith(".ts")) continue;
      const src = await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url));
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert(!/apiSecret|api_secret/.test(code), `${dir}/${entry.name} reads the API secret`);
      assert(!/\bbtoa\(/.test(code), `${dir}/${entry.name} builds a credential`);
    }
  }
});

Deno.test("index: the egress allowlist names all three datacenter hosts", () => {
  assertEquals(manifest.w6w.network.allow, [
    "api.cloudinary.com",
    "api-eu.cloudinary.com",
    "api-ap.cloudinary.com",
  ]);
});

/** The delivery host is not an API host and is never fetched. */
Deno.test("index: nothing fetches the delivery host", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    if (!code.includes("DELIVERY_BASE")) continue;
    assert(!/ctx\.fetch|\.request\(/.test(code), `${entry.name} fetches a delivery URL`);
  }
});

Deno.test("index: one auth method and two declared health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["basic"]);
  assertEquals(app.healthChecks!.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest's categories are in the controlled vocabulary", () => {
  assertEquals(manifest.w6w.id, "io.w6w.cloudinary");
  assertEquals(manifest.w6w.categories, ["storage", "documents", "developer-tools"]);
});
