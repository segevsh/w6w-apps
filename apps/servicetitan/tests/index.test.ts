import { denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const manifest = JSON.parse(
  await denoReadTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    appearance: { icon: { svg: string }; darkMode?: { icon: { svg: string } } };
  };
};

test("index: exports 17 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 17);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

test("index: the actions that are not safe to retry are honest about it", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "customer-create",
    "job-create",
    "job-note-create",
    "lead-create",
    "location-create",
  ]);
});

test("index: nothing here deletes data", () => {
  assertEquals(app.actions.filter((a) => a.key.includes("delete")), []);
});

test("index: one auth method and three health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["client-credentials"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "api", "quota"]);
});

test("index: the manifest names exactly the hosts the app calls, no wildcard", () => {
  assertEquals(manifest.w6w.network.allow.slice().sort(), [
    "api-integration.servicetitan.io",
    "api.servicetitan.io",
    "auth-integration.servicetitan.io",
    "auth.servicetitan.io",
    "status.servicetitan.com",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.servicetitan");
});

test("index: the icon is the vendor's real glyph, re-inked per theme only", async () => {
  const light = await denoReadTextFile(new URL("../assets/icon.svg", import.meta.url));
  const dark = await denoReadTextFile(new URL("../assets/icon.dark.svg", import.meta.url));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assertEquals(manifest.w6w.appearance.darkMode?.icon.svg, "./assets/icon.dark.svg");
  // Same artwork: identical once the single ink colour is normalised.
  const norm = (s: string) => s.replace(/fill="#?(000000|ffffff|white)"/gi, 'fill="INK"');
  assertEquals(norm(light), norm(dark));
  assert(light.includes('viewBox="0 0 39 36"'));
});
