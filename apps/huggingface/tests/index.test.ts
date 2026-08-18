import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 14 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 14);
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
 * A retried delete finds the repository already gone and that is the intended
 * state; a retried creation makes a second repository, and a retried completion
 * is a second inference, billed again.
 */
Deno.test("index: only creating a repository and running inference duplicate on a retry", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["chat-complete", "repo-create"]);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

/**
 * One token, three hosts: the Hub, the inference router and the datasets
 * server. `api-inference.huggingface.co` is deliberately absent — it no longer
 * resolves at all, so allowing it would only hide a DNS failure.
 */
Deno.test("index: the manifest allows the three hosts the app actually uses", () => {
  assertEquals(manifest.w6w.id, "io.w6w.huggingface");
  assertEquals(manifest.w6w.categories, ["ai", "developer-tools"]);
  for (
    const host of ["huggingface.co", "router.huggingface.co", "datasets-server.huggingface.co"]
  ) {
    assert(manifest.w6w.network.allow.includes(host), `${host} is not allowed`);
  }
  assertEquals(manifest.w6w.network.allow.includes("api-inference.huggingface.co"), false);
});

/** Weights are gigabytes; a workflow's data is not where they go. */
Deno.test("index: the only file read has a size ceiling", async () => {
  const src = await Deno.readTextFile(new URL("../actions/file-download.ts", import.meta.url));
  assert(/MAX_BYTES/.test(src), "file-download has no ceiling");
  assertEquals(app.actions.some((a) => a.key === "file-upload"), false);
});

/** A destructive action with no confirmation is a destructive action. */
Deno.test("index: deleting a repository demands the id twice", () => {
  const remove = app.actions.find((a) => a.key === "repo-delete")!;
  const keys = remove.params as Array<{ key: string; required?: boolean }>;
  const confirm = keys.find((p) => p.key === "confirmId")!;
  assertEquals(confirm.required, true);
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
 * A prompt is what somebody wrote and a completion is what came back. A run
 * log records counts, ids and shapes — never either of those, and never the
 * contents of a file this app read.
 */
Deno.test("index: nothing logs a prompt, a completion or a file's contents", async () => {
  for (const dir of ["actions", "lib"]) {
    for (const [name, src] of await sources(dir)) {
      const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
      for (const call of logs) {
        const object = call.slice(call.indexOf("{"));
        // The VALUES, not the keys: `count: rows.length` is a count and
        // `rows: rows` is the data itself.
        for (
          const forbidden of [
            /:\s*(?:content|messages|prompt|rows|text|results|files|search)\s*[,}]/i,
            /[{,]\s*(?:content|messages|prompt|rows|text|results|files|search)\s*[,}]/i,
          ]
        ) {
          assert(!forbidden.test(object), `${name} logs user content: ${object}`);
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
