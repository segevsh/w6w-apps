import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; appearance: { darkMode?: unknown } };
};

Deno.test("index: exports 26 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 26);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "perform", "trigger"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Anything that creates a second thing on a retry says so. */
Deno.test("index: the actions that duplicate on a retry are honest about it", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "issue-comment-create",
    "issue-create",
    "pull-request-create",
    "release-create",
    "repo-create",
  ]);
});

/** Two actions remove something a clone does not bring back. */
Deno.test("index: the destructive actions are gated behind a confirmation", () => {
  for (const key of ["repo-delete", "file-delete"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const confirm = (action.params as Array<{ key: string; required?: boolean }>)
      .find((p) => p.key === "confirm");
    assert(confirm, `${key} has no confirmation flag`);
    assertEquals(confirm!.required, true);
  }
});

/**
 * A bare name plus a stale connection default is how the wrong repository gets
 * deleted, so this one action must not resolve the owner from the connection.
 */
Deno.test("index: repo-delete refuses to infer the owner", async () => {
  const src = await Deno.readTextFile(new URL("../actions/repo-delete.ts", import.meta.url));
  const body = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert(
    body.includes("must not depend on"),
    "repo-delete must guard against the connection's default owner",
  );
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["instance", "service"]);
});

/**
 * A self-hostable app cannot name its hosts. The wide allowlist is the price,
 * and it matches the posture the pack already uses for mattermost and friends.
 */
Deno.test("index: the manifest is honest about being self-hostable", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.gitea");
});

Deno.test("index: the icon is the vendor's mark, in the vendor's colour", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Gitea</title>"), "the mark no longer names Gitea");
  assert(svg.includes("#609926"), "the mark lost Gitea's green");
  assertEquals(manifest.w6w.appearance.darkMode, undefined);
});

/**
 * `force_push` on a file write is the one flag here that discards history. It
 * must not be reachable from any action.
 */
Deno.test("index: no action can force-push", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const body = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert(!/force_push/.test(body), `${entry.name} can force-push`);
  }
});

/** Impersonating another user from an unattended workflow is out of scope. */
Deno.test("index: no action sends the Sudo header", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const body = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert(!/["'`]?[Ss]udo["'`]?\s*:/.test(body), `${entry.name} sets a Sudo header`);
  }
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

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
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
