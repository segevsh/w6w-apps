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

/** Creating a second cluster is a second hourly bill; everything else converges. */
Deno.test("index: only creating a cluster duplicates on a retry", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key);
  assertEquals(notIdempotent, ["cluster-create"]);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["service-account"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "credential", "quota"]);
});

/** The control plane and its status page. Clusters are reached by a driver. */
Deno.test("index: the manifest allows only the two hosts this app uses", () => {
  assertEquals(manifest.w6w.network.allow, ["cloud.mongodb.com", "status.mongodb.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.mongodb-atlas");
  assertEquals(manifest.w6w.categories, ["databases", "devops"]);
});

/**
 * The five paths that destroy data, cost money or open the perimeter. Each is
 * gated on a parameter the caller has to set deliberately.
 */
Deno.test("index: every destructive or perimeter-widening path is gated", () => {
  const params = (key: string) =>
    (app.actions.find((a) => a.key === key)!.params as Array<{ key: string }>).map((p) => p.key);

  assert(params("cluster-delete").includes("confirmName"), "cluster-delete has no gate");
  assert(params("cluster-update").includes("confirmUnprotect"), "cluster-update has no gate");
  assert(params("database-user-delete").includes("confirmUsername"), "user delete has no gate");
  assert(params("access-list-delete").includes("confirmValue"), "access delete has no gate");
  assert(
    params("access-list-add").includes("confirmOpenToInternet"),
    "opening the internet has no gate",
  );
});

/** Atlas defaults these the other way; an automation is nobody's supervision. */
Deno.test("index: creation defaults to the protective setting on both counts", () => {
  const create = app.actions.find((a) => a.key === "cluster-create")!
    .params as Array<{ key: string; default?: unknown }>;
  assertEquals(create.find((p) => p.key === "terminationProtection")!.default, true);
  const remove = app.actions.find((a) => a.key === "cluster-delete")!
    .params as Array<{ key: string; default?: unknown }>;
  assertEquals(remove.find((p) => p.key === "retainBackups")!.default, true);
});

/**
 * This app manages the control plane. Anything that looked like a query would
 * be a promise it cannot keep — the wire protocol is not HTTP.
 */
Deno.test("index: nothing pretends to read or write documents", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  for (const forbidden of ["document", "collection", "database", "query"]) {
    assertEquals(resources.has(forbidden), false, `${forbidden} is not something this API can do`);
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
 * `database-user-create` takes a password that is the only copy of a real
 * credential. A run log records the username and the flags, never the value.
 */
Deno.test("index: nothing logs a password, a connection string or an event's actor", async () => {
  for (const dir of ["actions", "lib"]) {
    for (const [name, src] of await sources(dir)) {
      const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
      for (const call of logs) {
        const object = call.slice(call.indexOf("{"));
        // The VALUES, not the keys: `count: users.length` is a count and
        // `users: users` is the records themselves.
        for (
          const forbidden of [
            /:\s*(?:password|secret|srv|connectionStrings|users|events|entries|value)\s*[,}]/i,
            /[{,]\s*(?:password|secret|srv|connectionStrings|users|events|entries)\s*[,}]/i,
          ]
        ) {
          assert(!forbidden.test(object), `${name} logs a secret or a record set: ${object}`);
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
