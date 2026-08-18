import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as { w6w: { id: string; categories: string[]; network: { allow: string[] } } };

Deno.test("index: exports 11 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 11);
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

/** create-modes and inc/dec are what make these two unsafe to retry blindly. */
Deno.test("index: the actions that are not safe to retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["document-create", "document-patch"]);
});

/**
 * Sanity's CDN rejects any POST that is not a query, and serves cached content
 * for up to two hours during an outage. Every write must force the live host.
 */
Deno.test("index: every write routes to the live host", async () => {
  for (const name of ["document-publish", "document-unpublish"]) {
    const src = await Deno.readTextFile(new URL(`../actions/${name}.ts`, import.meta.url));
    assert(/live: true/.test(src), `${name} does not force the live host`);
  }
  const mutate = await Deno.readTextFile(new URL("../lib/mutate.ts", import.meta.url));
  assert(/live: true/.test(mutate), "the shared mutate helper does not force the live host");
});

/** A health check answerable from cache is not a check. */
Deno.test("index: the dataset check never reads through the CDN", async () => {
  const src = await Deno.readTextFile(new URL("../health/dataset.ts", import.meta.url));
  assert(/dataHost\(projectId, false\)/.test(src), "the dataset check may use the CDN");
});

/** Both destructive shapes are gated: a query delete, and a purge. */
Deno.test("index: deleting is gated behind a confirmation", () => {
  const action = app.actions.find((a) => a.key === "document-delete")!;
  const confirm = (action.params as Array<{ key: string }>).find((p) => p.key === "confirm");
  assert(confirm, "document-delete has no confirmation flag");
});

/** Sanity supports a native dry run; every mutating action should offer it. */
Deno.test("index: every mutating action offers a dry run", () => {
  for (const key of ["document-create", "document-patch", "document-delete"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const dryRun = (action.params as Array<{ key: string }>).find((p) => p.key === "dryRun");
    assert(dryRun, `${key} offers no dry run`);
  }
});

/** The project is in the hostname, so the allowlist has to be a wildcard. */
Deno.test("index: the egress allowlist covers the project subdomains", () => {
  assertEquals(manifest.w6w.network.allow, [
    "api.sanity.io",
    "*.api.sanity.io",
    "*.apicdn.sanity.io",
  ]);
});

Deno.test("index: one auth method and two declared health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["token"]);
  assertEquals(app.healthChecks!.map((h) => h.key).sort(), ["dataset", "service"]);
});

Deno.test("index: the manifest's categories are in the controlled vocabulary", () => {
  assertEquals(manifest.w6w.id, "io.w6w.sanity");
  assertEquals(manifest.w6w.categories, ["cms", "databases", "developer-tools"]);
});
