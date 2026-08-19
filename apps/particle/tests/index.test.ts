import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 13 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 13);
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
 * Calling a function actuates hardware and publishing an event reaches a
 * fleet — neither is safe to repeat. Everything else converges.
 */
Deno.test("index: only the two that act on the world are non-idempotent", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["event-publish", "function-call"]);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["access-token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: the manifest allows only the API and the status page", () => {
  assertEquals(manifest.w6w.network.allow, ["api.particle.io", "status.particle.io"]);
  assertEquals(manifest.w6w.id, "io.w6w.particle");
  assertEquals(manifest.w6w.categories, ["iot", "devops"]);
});

/** The paths that act on hardware or on ownership. */
Deno.test("index: every consequential path is gated or checked", () => {
  const params = (key: string) =>
    (app.actions.find((a) => a.key === key)!.params as Array<{ key: string }>).map((p) => p.key);

  // Removes the device from the account.
  assert(params("device-unclaim").includes("confirmName"), "device-unclaim has no gate");
  // Publishes to every Particle account in the world.
  assert(params("event-publish").includes("confirmPublic"), "event-publish has no gate");
  // Can reflash the devices being added.
  assert(
    params("product-device-add").includes("confirmFirmwareRelease"),
    "product-device-add has no gate",
  );
  // Actuating hardware checks the device and the declared function first.
  assert(params("function-call").includes("checkFirst"), "function-call cannot check first");
  assert(params("variable-get").includes("checkFirst"), "variable-get cannot check first");
});

/** An event is private unless somebody says otherwise — unlike the API. */
Deno.test("index: publishing defaults to private, and checking defaults to on", () => {
  const publish = app.actions.find((a) => a.key === "event-publish")!
    .params as Array<{ key: string; default?: unknown }>;
  assertEquals(publish.find((p) => p.key === "private")!.default, true);

  for (const key of ["function-call", "variable-get"]) {
    const params = app.actions.find((a) => a.key === key)!
      .params as Array<{ key: string; default?: unknown }>;
    assertEquals(params.find((p) => p.key === "checkFirst")!.default, true, key);
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

const sources = async (dir: string) => {
  const out: Array<[string, string]> = [];
  for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    out.push([
      `${dir}/${entry.name}`,
      code(await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url))),
    ]);
  }
  return out;
};

Deno.test("index: nothing reaches the network except through ctx.fetch", async () => {
  for (const dir of ["actions", "lib", "health"]) {
    for (const [name, src] of await sources(dir)) {
      assert(
        !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
        `${name} calls global fetch`,
      );
      assert(!/\bDeno\./.test(src), `${name} touches Deno.*`);
      assert(!/from "node:/.test(src), `${name} imports a node module`);
      assert(!/\bimport\s*\(/.test(src), `${name} uses a dynamic import`);
    }
  }
});

Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for (const [name, src] of await sources("actions")) {
    assert(!/authorization/i.test(src), `${name} sets an authorization header`);
    assert(
      !/\bcredential\s*(?:\.|;|\)|\}|,|:|as\b)/i.test(src),
      `${name} reads the credential`,
    );
  }
});

/**
 * A variable is a sensor reading, a function argument is a command, and an
 * event payload is what a workflow is telling a fleet. All three are the
 * caller's data; a run log records names and counts.
 */
Deno.test("index: nothing logs a variable value, a function argument or an event payload", async () => {
  for (const dir of ["actions", "lib"]) {
    for (const [name, src] of await sources(dir)) {
      const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
      for (const call of logs) {
        const object = call.slice(call.indexOf("{"));
        // The VALUES, not the keys: `dataBytes: byteLength(data)` is a size
        // and `data: data` is the payload itself.
        for (
          const forbidden of [
            /:\s*(?:value|result|argument|data|devices|sims|payload|token)\s*[,}]/i,
            /[{,]\s*(?:value|result|argument|data|devices|sims|payload|token)\s*[,}]/i,
          ]
        ) {
          assert(!forbidden.test(object), `${name} logs caller data: ${object}`);
        }
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
