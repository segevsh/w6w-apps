import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 11 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 11);
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

/** Every write here converges: voting again, submitting a merged change. */
Deno.test("index: nothing is non-idempotent", () => {
  assertEquals(app.actions.filter((a) => a.idempotent === false).length, 0);
});

Deno.test("index: exports the auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["http-password"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "instance"]);
});

/** Gerrit is software people run, so an instance can be anywhere. */
Deno.test("index: the manifest admits an instance can be anywhere", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.gerrit");
  assertEquals(manifest.w6w.categories, ["version-control", "developer-tools"]);
});

/**
 * The whole client depends on stripping `)]}'`. Nothing may parse a Gerrit
 * body itself.
 */
Deno.test("index: no action parses a response body directly", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    assert(!/JSON\.parse\(/.test(src), `${entry.name} parses a body itself, skipping the prefix`);
  }
});

/**
 * Everything goes under `/a/`, because the bare path serves anonymous reads
 * and a broken credential would return less rather than fail. The health check
 * is the deliberate exception.
 */
Deno.test("index: the health check uses the bare path and the client uses /a/", async () => {
  const client = await Deno.readTextFile(new URL("../lib/client.ts", import.meta.url));
  assert(/\$\{this\.host\}\/a\$\{path\}/.test(client), "the client does not force /a/");

  const health = await Deno.readTextFile(new URL("../health/instance.ts", import.meta.url));
  assert(/\$\{host\}\/config\/server\/version/.test(health), "the health check should be bare");
  assert(!/\/a\/config/.test(health), "the health check must not use /a/");
});

/** Submitting writes to a branch and cannot be undone. */
Deno.test("index: submitting requires a confirmation", () => {
  const submit = app.actions.find((a) => a.key === "change-submit")!;
  const confirm = (submit.params as Array<{ key: string; required?: boolean }>).find((p) =>
    p.key === "confirm"
  );
  assertEquals(confirm?.required, true);
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(
      /\b(hint|description|label|placeholder|title|reason|message)\s*:\s*"(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
      "",
    );

const sources = async function* () {
  for (const dir of ["actions", "health", "lib"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.name.endsWith(".ts")) continue;
      yield {
        name: `${dir}/${entry.name}`,
        src: code(await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url))),
      };
    }
  }
};

Deno.test("index: nothing reaches the network except through ctx.fetch", async () => {
  for await (const { name, src } of sources()) {
    assert(!/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")), `${name} calls global fetch`);
    assert(!/\bDeno\./.test(src), `${name} touches Deno.*`);
    assert(!/\bfrom\s+"node:/.test(src), `${name} imports from node:`);
    assert(!/\bimport\s*\(/.test(src), `${name} uses a dynamic import`);
  }
});

Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(!/\bbtoa\(/.test(src), `${entry.name} encodes basic auth`);
    assert(
      !/\bcredential\s*(?:\.|;|\)|\}|,|:|as\b)/i.test(src),
      `${entry.name} reads the credential`,
    );
  }
});

/**
 * Review comments and commit messages are what people wrote. A run log records
 * change numbers, votes and counts.
 */
Deno.test("index: no action logs a review message or a comment", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [
          /:\s*(?:message|comments|comment|subject|changes|files|body)\s*[,}]/i,
          /[{,]\s*(?:message|comments|comment|subject|changes|files|body)\s*[,}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs review content: ${object}`);
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
