import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 21 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 21);
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
 * Every create writes a NEW record — there is no uniqueness constraint anywhere
 * in the AT Protocol, so a retry makes a second like, follow or post.
 */
Deno.test("index: creating a record is never idempotent; deleting one always is", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "blob-upload",
    "follow-create",
    "like-create",
    "post-create",
    "repost-create",
  ]);
  const idempotent = app.actions.filter((a) => a.idempotent === true).map((a) => a.key).sort();
  assertEquals(idempotent, [
    "follow-delete",
    "like-delete",
    "post-delete",
    "repost-delete",
  ]);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["app-password"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "pds", "quota"]);
});

/** The AT Protocol is federated, so a connection's PDS can be anywhere. */
Deno.test("index: the manifest admits a self-hosted PDS can be anywhere", () => {
  assertEquals(manifest.w6w.network.allow, [
    "bsky.social",
    "public.api.bsky.app",
    "bsky.app",
    "*",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.bluesky");
  assertEquals(manifest.w6w.categories, ["social-media", "communication"]);
});

/**
 * Creating a session is limited to roughly ten a day, so the app password may
 * be exchanged exactly once — anything else calling createSession would spend
 * that budget and strand the connection.
 */
Deno.test("index: nothing outside the exchange hook calls createSession", async () => {
  for (const dir of ["actions", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(!/createSession/.test(src), `${dir}/${entry.name} calls createSession`);
    }
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
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
    assert(!/accessJwt|refreshJwt/.test(src), `${entry.name} touches a session token`);
  }
});

/**
 * A post is what somebody wrote, a handle is who they are, and a notification
 * is who interacted with them. A run log records counts, DIDs and record keys.
 */
Deno.test("index: no action logs post text, handles or search queries", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [/\btext\b/i, /\bhandle\b/i, /\bq\b\s*[,:}]/, /\bposts\s*[,:}]/i]
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
