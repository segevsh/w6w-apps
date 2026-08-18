import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 18 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 18);
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
 * Only uploading media makes a new thing each time. Posting is idempotent
 * because the idempotency key is derived, and the favourite/boost verbs are
 * idempotent because Mastodon has no separate record to duplicate.
 */
Deno.test("index: only the media upload duplicates on a retry", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key);
  assertEquals(notIdempotent, ["media-upload"]);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["access-token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "instance", "quota"]);
});

/** Any server can be a Mastodon instance, so the allowlist cannot name them. */
Deno.test("index: the manifest admits an instance can be anywhere", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.mastodon");
  assertEquals(manifest.w6w.categories, ["social-media", "communication"]);
});

/**
 * `since_id` returns the newest and drops the middle; `min_id` walks forward
 * without gaps. Offering the first would be offering a way to lose posts.
 */
Deno.test("index: no action offers since_id", async () => {
  for (const action of app.actions) {
    const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
    assert(!keys.includes("sinceId"), `${action.key} offers sinceId`);
  }
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/since_id/.test(src), `${entry.name} sends since_id`);
  }
});

/** A fresh key would let a retry post twice. */
Deno.test("index: posting derives its idempotency key rather than generating one", async () => {
  const src = await Deno.readTextFile(new URL("../actions/status-post.ts", import.meta.url));
  assert(/deriveIdempotencyKey\(/.test(src), "status-post does not derive a key");
  assert(!/randomUUID/.test(src), "status-post generates a key, which a retry would not match");
  assertEquals(app.actions.find((a) => a.key === "status-post")!.idempotent, true);
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

Deno.test("index: no action reaches the network except through ctx.fetch", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(
      !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
      `${entry.name} calls global fetch`,
    );
    assert(!/\bDeno\./.test(src), `${entry.name} touches Deno.*`);
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
 * Posts are what people wrote and handles are who they are. A run log records
 * counts, ids and shapes.
 */
Deno.test("index: no action logs post text, a handle or a search query", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      // The VALUES, not the keys: `statuses: statuses.length` is a count, and
      // `statuses: statuses` is the posts themselves.
      for (
        const forbidden of [
          /:\s*(?:text|content|statuses|status|acct|handle|q|query)\s*[,}]/i,
          /[{,]\s*(?:text|content|statuses|status|acct|handle)\s*[,}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs user content: ${object}`);
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
