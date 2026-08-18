import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as { w6w: { id: string; categories: string[]; network: { allow: string[] } } };

Deno.test("index: exports 13 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 13);
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

/**
 * The finding the app is built around: /track answers 200 for everything,
 * including a bogus token, so a workflow can never learn it failed.
 */
Deno.test("index: no action calls the /track endpoint", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert(!/["'`]\/track/.test(code), `${entry.name} calls /track`);
  }
});

/**
 * Only the sign hook may hold a credential — so no action may reference the
 * project token, even though /engage needs it in the body.
 */
Deno.test("index: no action outside auth/ touches a credential", async () => {
  for (const dir of ["actions", "lib", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.name.endsWith(".ts")) continue;
      const src = await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url));
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert(!/\$token/.test(code), `${dir}/${entry.name} references the project token`);
      assert(!/\bbtoa\(/.test(code), `${dir}/${entry.name} builds a credential`);
      assert(
        !/serviceAccountSecret|projectToken/.test(code),
        `${dir}/${entry.name} reads a secret field`,
      );
    }
  }
});

/** Retried imports must not double-count. */
Deno.test("index: the import action requires $insert_id", async () => {
  const src = await Deno.readTextFile(new URL("../actions/event-import.ts", import.meta.url));
  assert(src.includes("$insert_id"), "event-import does not mention $insert_id");
  assertEquals(app.actions.find((a) => a.key === "event-import")!.idempotent, true);
});

Deno.test("index: deleting profiles is gated behind a confirmation", () => {
  const action = app.actions.find((a) => a.key === "profile-delete")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "profile-delete has no confirmation flag");
  assertEquals(confirm!.required, true);
});

/** Nine hosts across three families — the allowlist has to cover all of them. */
Deno.test("index: the egress allowlist covers the apex and its subdomains", () => {
  assertEquals(manifest.w6w.network.allow, ["mixpanel.com", "*.mixpanel.com"]);
});

Deno.test("index: one auth method and two declared health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["service-account"]);
  assertEquals(app.healthChecks!.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest's categories are in the controlled vocabulary", () => {
  assertEquals(manifest.w6w.id, "io.w6w.mixpanel");
  assertEquals(manifest.w6w.categories, ["analytics", "marketing"]);
});
