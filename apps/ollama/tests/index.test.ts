import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    categories: string[];
    apiDocs: string[];
    appearance: { icon: { url: string }; darkMode: { icon: { url: string } } };
  };
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
  assertEquals(keys.sort(), [
    "chat",
    "embed",
    "generate",
    "model-copy",
    "model-delete",
    "model-list",
    "model-pull",
    "model-running",
    "model-show",
    "model-unload",
    "version",
  ]);
});

Deno.test("index: every perform action declares idempotent explicitly; only generation repeats badly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["chat", "generate"]);
});

Deno.test("index: one auth method, and health checks that cannot leave the app at unknown", () => {
  assertEquals(app.auth!.map((a) => a.key), ["server"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "instance", "quota"]);
  for (const h of app.healthChecks!.filter((h) => h.unavailable)) {
    assertEquals(
      h.severity,
      "informational",
      `${h.key} is unavailable without being informational`,
    );
  }
});

/** The server is the user's, so it can be at any address. */
Deno.test("index: the manifest admits any host, and names the real icon files", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.ollama");
  assertEquals(manifest.w6w.categories, ["ai", "developer-tools"]);
  assertEquals(manifest.w6w.apiDocs, ["https://github.com/ollama/ollama/blob/main/docs/api.md"]);
  for (const url of [manifest.w6w.appearance.icon.url, manifest.w6w.appearance.darkMode.icon.url]) {
    assert(Deno.statSync(new URL(`../${url}`, import.meta.url)).isFile, url);
  }
});

Deno.test("index: every generation action asks for a single result, not a stream", async () => {
  for (const file of ["generate", "chat", "model-pull", "model-unload"]) {
    const src = await Deno.readTextFile(new URL(`../actions/${file}.ts`, import.meta.url));
    assert(/stream:\s*false/.test(src), `${file} does not set stream: false`);
  }
});

const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
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
    assert(!/api.?key/i.test(src), `${entry.name} handles the API key`);
  }
});

/** Prompts and replies are the user's data; a run log records the model and counts only. */
Deno.test("index: no action logs a prompt, a message or a response", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/ctx\.log\(/.test(src), `${entry.name} logs`);
  }
});
