import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 16 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 16);
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

/**
 * Two actions genuinely make something new each time: a key mints a fresh
 * secret, and a delete cannot be repeated against a device that is gone.
 */
Deno.test("index: only key-create and device-delete are non-idempotent", () => {
  const keys = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(keys, ["device-delete", "key-create"]);
});

Deno.test("index: exports both auth methods and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key", "oauth-client"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: the manifest names only the two hosts this app reaches", () => {
  assertEquals(manifest.w6w.network.allow, ["api.tailscale.com", "status.tailscale.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.tailscale");
  assertEquals(manifest.w6w.categories, ["security", "devops"]);
});

/**
 * Changing who may reach what belongs in a reviewed commit. `acl-validate`
 * checks a proposed policy without installing it; nothing here writes one.
 */
Deno.test("index: no action writes the policy file", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const writesPolicy = /method:\s*"(POST|PUT)"/.test(src) && /\/acl["`]/.test(src);
    assert(!writesPolicy, `${entry.name} writes the policy file`);
  }
  assertEquals(app.actions.filter((a) => a.resource === "acl").map((a) => a.key), [
    "acl-get",
    "acl-validate",
  ]);
});

/**
 * The three actions that cannot be undone from here all demand an explicit
 * confirmation rather than running on a parameter somebody mistyped.
 */
Deno.test("index: the irreversible actions require a confirmation", () => {
  for (const key of ["device-delete", "device-expire-key"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const confirm = (action.params as Array<{ key: string; required?: boolean }>).find((p) =>
      p.key === "confirm"
    );
    assert(confirm?.required === true, `${key} has no required confirm parameter`);
  }
  const routes = app.actions.find((a) => a.key === "device-routes-set")!;
  assert(
    (routes.params as Array<{ key: string }>).some((p) => p.key === "allowExitNode"),
    "device-routes-set does not gate approving an exit node",
  );
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
    assert(
      !/\bcredential\s*(?:\.|;|\)|\}|,|:|as\b)/i.test(src),
      `${entry.name} reads the credential`,
    );
    assert(!/tskey-/.test(src), `${entry.name} contains a Tailscale key literal`);
  }
});

/**
 * `key-create` returns a secret that exists nowhere else in the world. Logging
 * it would put it in a run log forever, so nothing logs a key or an address.
 */
Deno.test("index: no action logs a key, an address or a user's login", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      // The VALUES, not the keys: `devices: devices.length` is a count.
      for (
        const forbidden of [
          /:\s*(?:key|authKey|created|addresses|loginName|users|devices|hujson)\s*[,}]/i,
          /[{,]\s*(?:key|authKey|created|addresses|loginName|hujson)\s*[,}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs a secret or an identifier: ${object}`);
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
