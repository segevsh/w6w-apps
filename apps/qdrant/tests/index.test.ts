import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 19 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 19);
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

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** The two that make a new thing every time they are called. */
Deno.test("index: the actions that duplicate on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["collection-create", "snapshot-create"]);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), [
    "service",
    "instance",
    "collections",
    "quota",
  ]);
});

/**
 * Qdrant is self-hostable, so the instance may be anywhere. The allow-list
 * names Qdrant Cloud first and then has to admit that.
 */
Deno.test("index: the manifest admits a self-hosted instance can be anywhere", () => {
  assertEquals(manifest.w6w.network.allow, ["*.cloud.qdrant.io", "*"]);
  assertEquals(manifest.w6w.id, "io.w6w.qdrant");
  assertEquals(manifest.w6w.categories, ["search", "databases", "ai"]);
});

/**
 * The retired endpoints. `points/search`, `points/recommend` and
 * `points/discover` are gone from the current spec, and most tutorials online
 * still show them — so a copied path would 404 at run time.
 */
Deno.test("index: nothing calls the retired search, recommend or discover paths", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    for (const retired of ["points/search", "points/recommend", "points/discover"]) {
      assert(
        !new RegExp(`\`[^\`]*${retired}`).test(src),
        `${entry.name} calls the retired ${retired}`,
      );
    }
  }
});

/**
 * Qdrant's `wait` defaults to false: the call returns once the operation is
 * accepted, not once it is queryable, so "write then read" reliably misses.
 * Every write here defaults it the other way.
 */
Deno.test("index: every write action offers wait, defaulted on", () => {
  const writes = ["point-upsert", "point-delete", "payload-set", "payload-delete", "index-create"];
  for (const key of writes) {
    const action = app.actions.find((a) => a.key === key)!;
    const wait = (action.params as Array<{ key: string; default?: unknown }>)
      .find((p) => p.key === "wait");
    assert(wait, `${key} does not offer wait`);
    assertEquals(wait!.default, true, `${key} does not default wait on`);
  }
});

/** Both irreversible operations ask for something beyond the parameters. */
Deno.test("index: destroying data takes a second, deliberate input", () => {
  const collectionDelete = app.actions.find((a) => a.key === "collection-delete")!;
  const collectionKeys = (collectionDelete.params as Array<{ key: string }>).map((p) => p.key);
  assert(collectionKeys.includes("confirmName"), collectionKeys.join(","));

  const pointDelete = app.actions.find((a) => a.key === "point-delete")!;
  const pointKeys = (pointDelete.params as Array<{ key: string }>).map((p) => p.key);
  assert(pointKeys.includes("confirmFilterDelete"), pointKeys.join(","));
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
    assert(!/api-key["']?\s*\]?\s*=/i.test(src), `${entry.name} sets the api-key header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

/**
 * A payload is whatever the caller chose to store beside the vector — a
 * document, a customer record, a support ticket. A run log records collection
 * names, field names and counts.
 */
Deno.test("index: no action logs a payload or a vector", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (const forbidden of [/payload\s*[,:}]/i, /vectors?\s*[,:}]/i, /points\s*[,:}]/i]) {
        assert(!forbidden.test(object), `${entry.name} logs stored data: ${object}`);
      }
    }
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  assertEquals(code('hint: "reads the credential",').trim(), ",");
  assertEquals(code('description: "a" +\n    "credential",').trim(), ",");
});
