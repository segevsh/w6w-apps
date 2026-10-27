import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    displayName: string;
    modelProvider: { modelTypes: string[] };
    network: { allow: string[] };
    categories: string[];
    apiDocs: string[];
    appearance: { icon: { svg: string }; darkMode: { icon: { svg: string } } };
  };
};

Deno.test("index: exports 5 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 5);
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
  assertEquals(keys.sort(), ["chat", "embed", "generate", "model-list", "version"]);
});

Deno.test("index: no local model management — the cloud API exposes none of it", () => {
  for (const forbidden of ["model-pull", "model-copy", "model-delete", "model-unload"]) {
    assertEquals(app.actions.some((a) => a.key === forbidden), false, `${forbidden} exists`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["chat", "generate"]);
});

Deno.test("index: one auth method, and health checks that cannot leave the app at unknown", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "instance", "quota"]);
  for (const h of app.healthChecks!.filter((h) => h.unavailable)) {
    assertEquals(
      h.severity,
      "informational",
      `${h.key} is unavailable without being informational`,
    );
  }
});

Deno.test("index: the manifest is the cloud provider — llm + embedding, one host, an svg icon", () => {
  assertEquals(manifest.w6w.id, "io.w6w.ollama-cloud");
  assertEquals(manifest.w6w.displayName, "Ollama Cloud");
  assertEquals(manifest.w6w.modelProvider.modelTypes, ["llm", "embedding"]);
  assertEquals(manifest.w6w.network.allow, ["ollama.com"]);
  assertEquals(manifest.w6w.categories, ["ai"]);
  for (const url of [manifest.w6w.appearance.icon.svg, manifest.w6w.appearance.darkMode.icon.svg]) {
    assert(Deno.statSync(new URL(`../${url}`, import.meta.url)).isFile, url);
  }
});

Deno.test("index: every streaming endpoint asks for a single result, not a stream", async () => {
  // `/api/embed` is not a streaming endpoint at all; generate and chat are.
  for (const file of ["generate", "chat"]) {
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

Deno.test("index: no action reaches the network except through ctx.fetch, and never hardcodes a host", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(
      !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
      `${entry.name} calls global fetch`,
    );
    assert(!/\bDeno\./.test(src), `${entry.name} touches Deno.*`);
    assert(!/https?:\/\//.test(src), `${entry.name} builds its own URL instead of using BASE_URL`);
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
