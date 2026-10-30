import { denoReadDir, denoReadTextFile } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

const manifest = JSON.parse(
  await denoReadTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

test("index: exports 15 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 15);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(
      ["read", "search", "perform", "trigger"].includes(a.type),
      `${a.key} has type ${a.type}`,
    );
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

/** Everything here reads; nothing in Maps Platform changes anybody's data. */
test("index: nothing here performs — the whole surface is read-only", () => {
  assertEquals(app.actions.filter((a) => a.type === "perform").length, 0);
});

test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "apis", "quota"]);
});

test("index: the manifest names every host the app can reach", () => {
  assertEquals(manifest.w6w.network.allow, [
    "maps.googleapis.com",
    "places.googleapis.com",
    "routes.googleapis.com",
    "addressvalidation.googleapis.com",
    "roads.googleapis.com",
    "www.googleapis.com",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.google-maps");
  assertEquals(manifest.w6w.categories, ["developer-tools", "search"]);
});

/**
 * The generation-1 web services reject `X-Goog-Api-Key` — probed live — so the
 * only signing form that works across the surface is `?key=`. If an action ever
 * set the header itself, half the app would stop authenticating.
 */
test("index: the key is signed into the query, and no action sets a key header", async () => {
  assertEquals(app.auth![0].apiKey, { in: "query", name: "key" });
  for await (const entry of denoReadDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await denoReadTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/x-goog-api-key/i.test(src), `${entry.name} sets the api-key header`);
  }
});

/**
 * A rejected key is a 400 on the newer APIs and an HTTP 200 on the older ones.
 * Nothing may decide success from the status code alone.
 */
test("index: no action reads res.ok or a status code to decide success", async () => {
  for await (const entry of denoReadDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await denoReadTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/\.ok\b/.test(src), `${entry.name} reads res.ok — the web services answer 200 always`);
    assert(!/\.status\s*===\s*\d/.test(src), `${entry.name} branches on an HTTP status code`);
  }
});

/** Both search endpoints default to a mask below the Enterprise tier. */
test("index: every field mask param carries a default rather than demanding one", () => {
  const withMask = app.actions.filter((a) =>
    (a.params as Array<{ key: string }>).some((p) => p.key === "fieldMask")
  );
  assertEquals(withMask.length, 5);
  for (const action of withMask) {
    const mask = (action.params as Array<{ key: string; default?: unknown }>)
      .find((p) => p.key === "fieldMask")!;
    assert(typeof mask.default === "string" && mask.default.length > 0, action.key);
    assert(mask.default !== "*", `${action.key} defaults to the wildcard, which bills at the top`);
  }
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // Prose in a param hint or an output label is not code. Concatenated
    // continuations count too, or half a two-line description survives.
    .replace(
      /\b(hint|description|label|placeholder|title|reason|message)\s*:\s*"(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
      "",
    );

test("index: no action reaches the network except through ctx.fetch", async () => {
  for await (const entry of denoReadDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await denoReadTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(
      !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
      `${entry.name} calls global fetch`,
    );
    assert(!/\bDeno\./.test(src), `${entry.name} touches Deno.*`);
  }
});

test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for await (const entry of denoReadDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await denoReadTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
    assert(!/\bapiKey\b/.test(src), `${entry.name} handles the api key`);
  }
});

/**
 * An address is where somebody lives, a MAC address identifies their device,
 * and a GPS trace is where they went. A run log records counts and verdicts.
 */
test("index: no action logs a location, an address or a device identifier", async () => {
  for await (const entry of denoReadDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await denoReadTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [
          /address\s*[,:}]/i,
          /location\s*[,:}]/i,
          /\blat\b/i,
          /\blng\b/i,
          /macAddress/i,
          /formattedAddress/i,
          /\bpath\s*[,:}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs personal data: ${object}`);
      }
    }
  }
});

test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  assertEquals(code('hint: "reads the credential",').trim(), ",");
  assertEquals(code('description: "a" +\n    "credential",').trim(), ",");
});
