import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as { w6w: { id: string; categories: string[]; network: { allow: string[] } } };

Deno.test("index: exports 12 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 12);
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

Deno.test("index: the actions that post a second update say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "component-create",
    "incident-create",
    "incident-update",
    "metric-data-add",
  ]);
});

/**
 * Notifying every subscriber is irrevocable, so it must never happen because a
 * field was omitted.
 */
Deno.test("index: every notifying action defaults delivery to off", () => {
  for (const key of ["incident-create", "incident-update", "incident-resolve"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const p = (action.params as Array<{ key: string; default?: unknown }>)
      .find((p) => p.key === "deliverNotifications");
    assert(p, `${key} has no notification flag`);
    assertEquals(p!.default, false, `${key} defaults to notifying`);
  }
});

/** One request per second: nothing may loop over components. */
Deno.test("index: no action loops over components", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    // A write inside a loop body is what the one-per-second limit forbids.
    assert(
      !/for\s*\([^)]*\)\s*\{[\s\S]{0,400}?method:\s*"(POST|PATCH)"/.test(code),
      `${entry.name} writes inside a loop`,
    );
  }
});

/** A status page is a public record; rewriting it is not a workflow step. */
Deno.test("index: nothing deletes an incident", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert(!/method:\s*"DELETE"/.test(code), `${entry.name} deletes something`);
  }
});

Deno.test("index: the egress allowlist is the API host alone", () => {
  assertEquals(manifest.w6w.network.allow, ["api.statuspage.io"]);
});

Deno.test("index: one auth method and two declared health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest's categories are in the controlled vocabulary", () => {
  assertEquals(manifest.w6w.id, "io.w6w.statuspage");
  assertEquals(manifest.w6w.categories, ["monitoring", "communication", "devops"]);
});
