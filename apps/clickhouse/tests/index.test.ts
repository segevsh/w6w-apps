import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 15 actions with unique kebab-case keys and valid types", () => {
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

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** A retried insert writes the rows again; a retried create is a second service. */
Deno.test("index: only creating a service and inserting rows duplicate on a retry", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["query-insert", "service-create"]);
});

/** Two planes, two credentials. */
Deno.test("index: exports both auth methods and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key", "service"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: the manifest allows the control plane, the services and the status page", () => {
  assertEquals(manifest.w6w.network.allow, [
    "api.clickhouse.cloud",
    "*.clickhouse.cloud",
    "*.clickhouse.com",
    "status.clickhouse.com",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.clickhouse");
  assertEquals(manifest.w6w.categories, ["databases", "data-warehousing"]);
});

/** The whole point of choosing ClickHouse for this slug. */
Deno.test("index: the app can actually query, not only manage", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  assert(resources.has("query"), "there is no query action");
  assert(resources.has("table"), "there is no schema action");
  assert(resources.has("service"), "there is no control-plane action");
});

/** The destructive and exposure-widening paths, each gated deliberately. */
Deno.test("index: every irreversible or exposure-widening path is gated", () => {
  const params = (key: string) =>
    (app.actions.find((a) => a.key === key)!.params as Array<{ key: string }>).map((p) => p.key);

  // Deletes the service, its data and its backups together.
  assert(params("service-delete").includes("confirmName"), "service-delete has no gate");
  // A stopped service does not wake on a query.
  assert(params("service-state").includes("confirmStop"), "service-state has no gate");
  // Always-on billing.
  assert(params("service-scale").includes("confirmAlwaysOn"), "service-scale has no gate");
  // A database reachable from every address.
  assert(
    params("service-create").includes("confirmOpenToInternet"),
    "service-create has no gate",
  );
  assert(
    params("ip-access-list-set").includes("confirmOpenToInternet"),
    "ip-access-list-set has no open-access gate",
  );
  // Removing an address stops it connecting at all.
  assert(
    params("ip-access-list-set").includes("confirmRemovals"),
    "ip-access-list-set has no removal gate",
  );
});

/** A real server-side guarantee, not a statement this app parsed. */
Deno.test("index: querying is read-only by default", () => {
  const allowWrites = (app.actions.find((a) => a.key === "query-run")!
    .params as Array<{ key: string; default?: unknown }>).find((p) => p.key === "allowWrites")!;
  assertEquals(allowWrites.default, false);
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
 * A generated service password is the only copy in existence, SQL can carry
 * values, and rows are the caller's data. A run log records counts.
 */
Deno.test("index: nothing logs a password, a statement or result rows", async () => {
  for (const dir of ["actions", "lib"]) {
    for (const [name, src] of await sources(dir)) {
      const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
      for (const call of logs) {
        const object = call.slice(call.indexOf("{"));
        // The VALUES, not the keys: `rowCount: rows.length` is a count and
        // `rows: rows` is the data itself.
        for (
          const forbidden of [
            /:\s*(?:password|sql|rows|body|data|services|activities|result)\s*[,}]/i,
            /[{,]\s*(?:password|sql|rows|body|data|services|activities|result)\s*[,}]/i,
          ]
        ) {
          assert(!forbidden.test(object), `${name} logs a secret or a payload: ${object}`);
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
