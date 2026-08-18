import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    appearance: { icon: { svg: string }; darkMode?: unknown };
  };
};

Deno.test("index: exports 31 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 31);
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

/** Anything that fires twice on a retry says so. */
Deno.test("index: the actions that duplicate on retry are honest about it", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "command-run",
    "system-command",
    "system-erase",
    "user-create",
    "user-group-create",
    "user-sshkey-add",
  ]);
});

/**
 * Four actions do damage nothing later undoes. Each requires an explicit
 * confirmation on top of the id, so a blank or stale field cannot reach them.
 */
Deno.test("index: every destructive action is gated behind its own confirmation", () => {
  const gated = ["user-delete", "system-delete", "system-erase", "user-group-delete"];
  for (const key of gated) {
    const action = app.actions.find((a) => a.key === key)!;
    const confirm = (action.params as Array<{ key: string; required?: boolean }>)
      .find((p) => p.key === "confirm");
    assert(confirm, `${key} has no confirmation flag`);
    assertEquals(confirm!.required, true, `${key}'s confirmation is not required`);
  }
});

/**
 * Erase must not be reachable by a wrong dropdown value in the action that
 * locks and restarts machines.
 */
Deno.test("index: erase is its own action, and not a choice in system-command", () => {
  const command = app.actions.find((a) => a.key === "system-command")!;
  const options = (command.params as Array<{ key: string; options?: unknown }>)
    .find((p) => p.key === "command")!.options as Array<{ value: string }>;
  assertEquals(options.map((o) => o.value), ["lock", "restart", "shutdown"]);
  assert(app.actions.some((a) => a.key === "system-erase"));
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

/** Three regional consoles, and a key belongs to exactly one. */
Deno.test("index: the manifest allowlists all three regional consoles", () => {
  assertEquals(manifest.w6w.network.allow, [
    "console.jumpcloud.com",
    "console.eu.jumpcloud.com",
    "console.in.jumpcloud.com",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.jumpcloud");
});

Deno.test("index: the icon is the vendor's mark, in the vendor's colour", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>JumpCloud</title>"), "the mark no longer names JumpCloud");
  // The fill arrives through a <style> rule, which is why the nested viewport
  // re-frame exists rather than a transform.
  assert(svg.includes("#4cc2bf"), "the mark lost JumpCloud's teal");
  assertEquals(manifest.w6w.appearance.darkMode, undefined);
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
    assert(!/x-api-key/i.test(src), `${entry.name} sets the api key header`);
    assert(!/x-org-id/i.test(src), `${entry.name} sets the org header — that is the auth hook's`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

/**
 * The two secrets that pass through an action body must not reach a log line:
 * a password being set, and a private key pasted where a public one belongs.
 */
Deno.test("index: the password actions never log their payload", async () => {
  for (const name of ["user-password-set.ts", "user-create.ts"]) {
    const src = code(await Deno.readTextFile(new URL(`../actions/${name}`, import.meta.url)));
    // Only the data object matters — the message is a fixed string, and it is
    // allowed to say the word.
    const data = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    // Without this the loop below could pass by matching nothing at all.
    assert(data.length > 0, `${name}: the log-data matcher found nothing to check`);
    for (const call of data) {
      const object = call.slice(call.indexOf("{"));
      assert(!/password/i.test(object), `${name} logs a password-shaped field: ${object}`);
    }
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// x-api-key\nconst a = 1;").trim(), "const a = 1;");
});
