import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 12 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 12);
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

/** Each job creation makes a new job; pausing and cancelling converge. */
Deno.test("index: only the two job-creating actions are non-idempotent", () => {
  const keys = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(keys, ["sync-reset", "sync-trigger"]);
});

Deno.test("index: exports the auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["application"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "api"]);
});

/** Airbyte is self-hosted as often as it is used on Cloud. */
Deno.test("index: the manifest admits a deployment can be anywhere", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.airbyte");
  assertEquals(manifest.w6w.categories, ["data-warehousing", "devops"]);
});

/**
 * `sync` and `reset` differ by one word in the same request body, and only one
 * of them deletes. They must not be one action with a parameter.
 */
Deno.test("index: resetting is a separate, confirmed action", async () => {
  const trigger = await Deno.readTextFile(new URL("../actions/sync-trigger.ts", import.meta.url));
  assert(!/"reset"/.test(trigger), "sync-trigger can send a reset");

  const reset = app.actions.find((a) => a.key === "sync-reset")!;
  const confirm = (reset.params as Array<{ key: string; required?: boolean }>).find((p) =>
    p.key === "confirm"
  );
  assertEquals(confirm?.required, true);
});

/**
 * A job can be over and not fine. Every action that reports a job status must
 * treat `incomplete` as its own answer rather than folding it into either.
 */
Deno.test("index: the job actions never treat incomplete as a success", async () => {
  for (const name of ["job-list", "job-get"]) {
    const src = await Deno.readTextFile(new URL(`../actions/${name}.ts`, import.meta.url));
    assert(/incomplete/.test(src), `${name} does not mention the incomplete status`);
  }
  const get = app.actions.find((a) => a.key === "job-get")!;
  const keys = (get.output as Array<{ key: string }>).map((o) => o.key);
  assert(keys.includes("finished") && keys.includes("succeeded"), "job-get collapses the two");
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
    assert(!/client_secret|clientSecret/.test(src), `${entry.name} touches the client secret`);
  }
});

/**
 * A source's configuration is a database password. Airbyte masks it, and
 * nothing here should put even the masked shape into a run log.
 */
Deno.test("index: no action logs a connector configuration", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [
          /:\s*(?:configuration|config|sources|destinations|connections|jobs|data)\s*[,}]/i,
          /[{,]\s*(?:configuration|config|sources|destinations|connections|jobs|data)\s*[,}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs configuration: ${object}`);
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
