import { denoReadDir, denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const manifest = JSON.parse(
  await denoReadTextFile(new URL("../package.json", import.meta.url)),
) as { w6w: { id: string; categories: string[]; network: { allow: string[] } } };

test("index: exports 14 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 14);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key} declares no output`);
  }
});

test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

test("index: the actions that create a second thing say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "asset-create",
    "live-stream-create",
    "playback-id-create",
    "upload-create",
  ]);
});

/** Deleting a video, or killing a broadcaster's key, is gated. */
test("index: the destructive actions carry a confirmation", () => {
  for (const key of ["asset-delete", "live-stream-delete"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const confirm = (action.params as Array<{ key: string; required?: boolean }>)
      .find((p) => p.key === "confirm");
    assert(confirm, `${key} has no confirmation flag`);
    assertEquals(confirm!.required, true);
  }
});

/**
 * The delivery hosts are values this app returns, not hosts it calls — which is
 * why they are absent from the allowlist.
 */
test("index: nothing fetches the delivery hosts", () => {
  assertEquals(manifest.w6w.network.allow, ["api.mux.com"]);
});

test("index: the URL builder makes no request", async () => {
  const src = await denoReadTextFile(
    new URL("../actions/playback-url-build.ts", import.meta.url),
  );
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert(!/ctx\.fetch|MuxClient/.test(code), "playback-url-build makes a request");
});

/**
 * A stream key is a broadcaster's credential, so no action may read one out of
 * a response. Prose *about* it is the point — what must not exist is code that
 * touches the field.
 */
test("index: no action reads a stream key out of a response", async () => {
  for await (const entry of denoReadDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await denoReadTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      // User-facing prose is documentation, not a field access.
      .replace(
        /(hint|description|label|placeholder|title):\s*"(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
        "",
      );
    assert(!/\.stream_key|stream_key\s*[:,}]/.test(code), `${entry.name} reads a stream key`);
  }
});

test("index: one auth method and two declared health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["basic"]);
  assertEquals(app.healthChecks!.map((h) => h.key).sort(), ["quota", "service"]);
});

test("index: the manifest's categories are in the controlled vocabulary", () => {
  assertEquals(manifest.w6w.id, "io.w6w.mux");
  assertEquals(manifest.w6w.categories, ["video", "developer-tools", "analytics"]);
});
