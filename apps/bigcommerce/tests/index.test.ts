import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import manifest from "../package.json" with { type: "json" };

const actionKeys = app.actions.map((a) => a.key);

Deno.test("index: exports every action exactly once, with unique kebab-case keys", () => {
  assertEquals(new Set(actionKeys).size, actionKeys.length, "duplicate action key");
  for (const key of actionKeys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: the exported action list matches the files in actions/", async () => {
  // A hand-written list would drift silently; this walks the directory.
  const files: string[] = [];
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (entry.isFile && entry.name.endsWith(".ts")) files.push(entry.name.replace(/\.ts$/, ""));
  }
  assertEquals(files.sort(), [...actionKeys].sort());
});

Deno.test("index: every action declares a type the spec allows", () => {
  for (const action of app.actions) {
    assert(
      ["read", "search", "perform"].includes(action.type),
      `${action.key} has type ${action.type}`,
    );
  }
});

Deno.test("index: every perform action states `idempotent` explicitly", () => {
  for (const action of app.actions) {
    if (action.type !== "perform") continue;
    assertEquals(
      typeof action.idempotent,
      "boolean",
      `${action.key} does not declare idempotent`,
    );
  }
});

Deno.test("index: every action has a description, params array and output", () => {
  for (const action of app.actions) {
    assert(action.description, `${action.key} has no description`);
    assert(Array.isArray(action.params), `${action.key} has no params array`);
    assert(action.output, `${action.key} declares no output`);
  }
});

Deno.test("index: every action param has a unique key and a label", () => {
  for (const action of app.actions) {
    const keys = (action.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${action.key} has a duplicate param key`);
    for (const param of action.params ?? []) {
      assert(param.label, `${action.key}.${param.key} has no label`);
    }
  }
});

Deno.test("index: declares the one auth method, with the fields the API needs", () => {
  assertEquals(app.auth?.length, 1);
  const auth = app.auth![0];
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "custom");
  assertEquals(typeof auth.test, "function");
  assertEquals(typeof auth.sign, "function");

  const fields = Object.fromEntries((auth.fields ?? []).map((f) => [f.key, f]));
  assertEquals(Object.keys(fields).sort(), ["accessToken", "storeHash"]);
  // The token is a credential; the store hash is a path segment and must NOT be
  // masked, or a merchant cannot check what they pasted.
  assertEquals(fields.accessToken.type, "secret");
  assertEquals(fields.storeHash.type, "string");
  assertEquals(fields.storeHash.secret, undefined);
});

Deno.test("index: declares five health checks, four live and one declared absence", () => {
  const checks = app.healthChecks ?? [];
  assertEquals(checks.map((c) => c.key).sort(), [
    "api",
    "plan-limits",
    "quota",
    "service",
    "store",
  ]);
  const live = checks.filter((c) => typeof c.check === "function");
  const absent = checks.filter((c) => c.unavailable !== undefined);
  assertEquals(live.length, 4);
  assertEquals(absent.length, 1);
});

Deno.test("index: the declared absence is `informational`, or it pins the app at unknown", () => {
  for (const check of app.healthChecks ?? []) {
    if (!check.unavailable) continue;
    assertEquals(check.severity, "informational", `${check.key} would pin the roll-up at unknown`);
    assert(check.unavailable.reason.length > 40, `${check.key} gives no real reason`);
    assertEquals(typeof check.check, "undefined", `${check.key} has both a hook and unavailable`);
  }
});

Deno.test("index: only unsigned checks widen egress, and only to the status host", () => {
  for (const check of app.healthChecks ?? []) {
    if (!check.network?.allow?.length) continue;
    assert(
      check.credential === "none" || check.credential === "context",
      `${check.key} widens egress while signed`,
    );
    assertEquals(check.network.allow, ["status.bigcommerce.com"]);
  }
});

Deno.test("index: the manifest allows exactly the one API host", () => {
  assertEquals(manifest.w6w.network.allow, ["api.bigcommerce.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.bigcommerce");
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
});

Deno.test("index: the shipped icon is the verbatim simple-icons BigCommerce mark", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // The vendor's own site serves a ~378 KB catch-all for unknown asset paths, so
  // "we downloaded something" is not evidence. The title is.
  assert(svg.includes("<title>BigCommerce</title>"), "icon does not identify itself");
  assertEquals(svg.length, 700, "icon is not the 700-byte file that was verified");
});

/**
 * Derive the exact set of API routes the actions call, by reading the sources
 * rather than by keeping a list. A hand-written table reads as exhaustive and
 * is not: this walks every file in `actions/` and reconstructs the path from
 * the client method that was called (`.v2`/`.v2List` prepend `/v2`,
 * `.v3`/`.v3Page` prepend `/v3`, `.status` takes a full path).
 */
async function routesFromActions(): Promise<string[]> {
  const dir = new URL("../actions/", import.meta.url);
  const routes = new Set<string>();
  for await (const entry of Deno.readDir(dir)) {
    if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(entry.name, dir));
    // Strip comments: deprecated paths are discussed in prose on purpose.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    const call = /\.(v2List|v2|v3Page|v3|status)\(\s*(?:`([^`]*)`|"([^"]*)")/g;
    for (const m of code.matchAll(call)) {
      const method = m[1];
      // A `${…}` interpolation is an id; normalise it so the template compares.
      const raw = (m[2] ?? m[3]).replace(/\$\{[^}]*\}/g, "{id}");
      const prefix = method === "status" ? "" : method.startsWith("v2") ? "/v2" : "/v3";
      routes.add(`${prefix}${raw}`);
    }
  }
  return [...routes].sort();
}

Deno.test("index: every route the actions call was verified live against the API", async () => {
  // Each of these answered `401 X-Auth-Token header is required` to an
  // unauthenticated request on 2026-08-11 — which, because BigCommerce resolves
  // the route before authenticating, proves the route exists. A path not on this
  // list has not been checked, and the test fails rather than letting it ship.
  const verified = [
    "/v2/order_statuses",
    "/v2/orders",
    "/v2/orders/count",
    "/v2/orders/{id}",
    "/v2/orders/{id}/products",
    "/v2/orders/{id}/shipments",
    "/v2/orders/{id}/shipping_addresses",
    "/v2/store",
    "/v3/abandoned-carts/{id}",
    "/v3/carts",
    "/v3/carts/{id}",
    "/v3/catalog/brands",
    "/v3/catalog/products",
    "/v3/catalog/products/{id}",
    "/v3/catalog/products/{id}/variants/{id}",
    "/v3/catalog/summary",
    "/v3/catalog/trees",
    "/v3/catalog/trees/categories",
    "/v3/catalog/variants",
    "/v3/customers",
    "/v3/customers/addresses",
    "/v3/hooks",
    "/v3/hooks/{id}",
    "/v3/inventory/adjustments/relative",
    "/v3/inventory/items",
    "/v3/inventory/locations",
    "/v3/orders/{id}/transactions",
    "/v3/pricelists",
    "/v3/pricelists/{id}/records",
  ];
  assertEquals(await routesFromActions(), verified);
});

Deno.test("index: no action reaches a path the vendor has deprecated", async () => {
  // From the Deprecations and Sunsets page, read 2026-08-11. Compared against
  // the derived route set above, so the version prefix is part of the match —
  // `/v2/customers` is deprecated while `/v3/customers` is the replacement.
  const deprecated = new Set([
    "/v2/brands",
    "/v2/categories",
    "/v2/customers",
    "/v2/options",
    "/v2/option_sets",
    "/v2/pages",
    "/v2/products",
    "/v2/redirects",
    "/v3/catalog/categories",
    "/v3/content/widgets/search",
    "/v3/hooks/events",
  ]);
  for (const route of await routesFromActions()) {
    for (const bad of deprecated) {
      assert(
        route !== bad && !route.startsWith(`${bad}/`),
        `an action calls the deprecated path ${bad} (as ${route})`,
      );
    }
  }
});
