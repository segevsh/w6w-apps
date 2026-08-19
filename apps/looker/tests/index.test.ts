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

/**
 * Everything here reads. Looker's write surface exists, and creating Looks,
 * dashboards or scheduled plans through a workflow means a workflow owning
 * content an analyst is meant to own — which is the wrong division of labour
 * and is not what this app is for.
 */
Deno.test("index: every action is a read or a search, so none can be non-idempotent", () => {
  for (const a of app.actions) {
    assert(a.type === "read" || a.type === "search", `${a.key} is a ${a.type}`);
  }
  assertEquals(app.actions.filter((a) => a.idempotent === false).length, 0);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-credentials"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "instance"]);
});

/** Every Looker deployment is its own host, hosted or not. */
Deno.test("index: the manifest admits an instance can be anywhere", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.looker");
  assertEquals(manifest.w6w.categories, ["analytics", "data-warehousing"]);
});

/**
 * The load-bearing rule of this app: every query runs on the customer's
 * warehouse, and Looker's `-1` means no ceiling. Both query actions must
 * require a positive limit rather than passing one through.
 */
Deno.test("index: both query actions require a positive limit and refuse -1", async () => {
  for (const name of ["query-run", "look-run"]) {
    const src = await Deno.readTextFile(new URL(`../actions/${name}.ts`, import.meta.url));
    assert(/limit <= 0/.test(src), `${name} does not reject a non-positive limit`);
    const action = app.actions.find((a) => a.key === name)!;
    const limit = (action.params as Array<{ key: string; default?: unknown }>).find((p) =>
      p.key === "limit"
    )!;
    assert(Number(limit.default) > 0, `${name}'s default limit is not positive`);
  }
});

/** Looker's API calls the Explore `view`, and the LookML view is a different thing. */
Deno.test("index: nothing sends a LookML view where an Explore name belongs", async () => {
  const src = await Deno.readTextFile(new URL("../actions/query-run.ts", import.meta.url));
  assert(/view: explore/.test(src), "query-run does not map the Explore onto `view`");
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
    // The sandbox has no dynamic import.
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
    assert(!/client_secret/.test(src), `${entry.name} touches the client secret`);
  }
});

/**
 * Query results are the customer's business data and a recipient list is a
 * list of people. A run log records counts, ids and shapes.
 */
Deno.test("index: no action logs a row, a recipient address or an email", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      // The VALUES, not the keys: `rows: rows.length` is a count, `rows: rows`
      // is the customer's data.
      for (
        const forbidden of [
          /:\s*(?:rows|result|data|address|email|destinations|users|raw|sql)\s*[,}]/i,
          /[{,]\s*(?:rows|result|data|address|email|destinations|users|raw|sql)\s*[,}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs data: ${object}`);
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
