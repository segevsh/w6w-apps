import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 20 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 20);
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
 * A retried lock is a 409 because the first one succeeded, and a retried
 * create makes a second workspace or a second run. Everything else converges.
 */
Deno.test("index: only the three that duplicate on a retry are non-idempotent", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["run-create", "workspace-create", "workspace-lock"]);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "instance", "quota"]);
});

/** Terraform Enterprise is the same API at the customer's own address. */
Deno.test("index: the manifest admits an instance can be anywhere", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.terraform");
  assertEquals(manifest.w6w.categories, ["devops", "developer-tools"]);
});

/**
 * The three ways this app can change real infrastructure. Each is gated on a
 * parameter the caller has to set deliberately, and the gates are asserted
 * here so removing one fails the suite rather than passing quietly.
 */
Deno.test("index: every infrastructure-changing path is gated", () => {
  const params = (key: string) =>
    (app.actions.find((a) => a.key === key)!.params as Array<{ key: string }>).map((p) => p.key);

  // Queueing an applyable run, and a destroy run.
  assert(params("run-create").includes("confirmApplyable"), "run-create has no apply gate");
  assert(params("run-create").includes("confirmDestroy"), "run-create has no destroy gate");
  // Confirming an apply that destroys.
  assert(params("run-apply").includes("acknowledgeDestroys"), "run-apply has no destroy gate");
  // Deleting a workspace that still manages resources.
  assert(params("workspace-delete").includes("confirmName"), "workspace-delete has no gate");
  // Turning auto-apply on, which converts every future plan into a change.
  assert(params("workspace-update").includes("confirmAutoApply"), "workspace-update has no gate");
  // Overriding a lock that may belong to a running apply.
  assert(params("workspace-unlock").includes("confirmForce"), "workspace-unlock has no gate");
  // Killing a run rather than letting it stop safely.
  assert(params("run-cancel").includes("confirmForce"), "run-cancel has no gate");
  // Deleting a value nothing could ever read back.
  assert(params("variable-delete").includes("confirmKey"), "variable-delete has no gate");
});

/** Plan-only cannot apply under any workspace setting. */
Deno.test("index: queueing a run defaults to plan-only", () => {
  const planOnly = (app.actions.find((a) => a.key === "run-create")!
    .params as Array<{ key: string; default?: unknown }>).find((p) => p.key === "planOnly")!;
  assertEquals(planOnly.default, true);
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
 * Variable values are provider credentials and state outputs are connection
 * strings. A run log records counts, ids and key NAMES — never a value.
 */
Deno.test("index: nothing logs a variable value or a state output value", async () => {
  for (const dir of ["actions", "lib"]) {
    for (const [name, src] of await sources(dir)) {
      const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
      for (const call of logs) {
        const object = call.slice(call.indexOf("{"));
        // The VALUES, not the keys: `count: outputs.length` is a count and
        // `outputs: outputs` is the data itself.
        for (
          const forbidden of [
            /:\s*(?:value|values|outputs|variables|details|secret|token)\s*[,}]/i,
            /[{,]\s*(?:value|values|outputs|variables|details|secret|token)\s*[,}]/i,
          ]
        ) {
          assert(!forbidden.test(object), `${name} logs a value: ${object}`);
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
