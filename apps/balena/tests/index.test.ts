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

/** Purging destroys data that cannot be recreated; everything else converges. */
Deno.test("index: only purging is non-idempotent", () => {
  assertEquals(app.actions.filter((a) => a.idempotent === false).map((a) => a.key), [
    "device-purge-data",
  ]);
});

Deno.test("index: exports the auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: the manifest names only the two hosts this app reaches", () => {
  assertEquals(manifest.w6w.network.allow, ["api.balena-cloud.com", "status.balena.io"]);
  assertEquals(manifest.w6w.id, "io.w6w.balena");
  assertEquals(manifest.w6w.categories, ["iot", "devops"]);
});

/**
 * The four supervisor actions reach a device over balena's VPN, and every one
 * must check the device is online first — balena does not queue them.
 */
Deno.test("index: every supervisor action requires the device to be online first", async () => {
  for (
    const name of [
      "device-reboot",
      "device-restart-services",
      "device-identify",
      "device-purge-data",
    ]
  ) {
    const src = await Deno.readTextFile(new URL(`../actions/${name}.ts`, import.meta.url));
    assert(/is_online !== true/.test(src), `${name} does not check the device is online`);
    assert(/\.supervisor\(/.test(src), `${name} does not use the supervisor proxy`);
  }
});

/** The trap: /application answers 200 with no credential at all. */
Deno.test("index: the auth test does not probe the endpoint that needs no credential", async () => {
  const src = await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url));
  assert(/user\/v1\/whoami/.test(src), "the auth test does not use whoami");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert(!/\/application/.test(code), "the auth test reaches /application, which needs no key");
});

/** Purging is irreversible and balena keeps no copy. */
Deno.test("index: purging requires a confirmation", () => {
  const purge = app.actions.find((a) => a.key === "device-purge-data")!;
  const confirm = (purge.params as Array<{ key: string; required?: boolean }>).find((p) =>
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
    assert(
      !/\bcredential\s*(?:\.|;|\)|\}|,|:|as\b)/i.test(src),
      `${entry.name} reads the credential`,
    );
  }
});

/**
 * Environment variable values are configuration and some of them are secrets.
 * A run log records names and counts.
 */
Deno.test("index: no action logs a variable value or a device's address", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [
          /:\s*(?:value|values|effective|deviceVariables|fleetVariables|ip_address|devices)\s*[,}]/i,
          /[{,]\s*(?:value|values|effective|deviceVariables|fleetVariables|ip_address)\s*[,}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs a value: ${object}`);
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
