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

/** Creating makes a new story; deleting cannot be repeated. */
Deno.test("index: only creating and deleting are non-idempotent", () => {
  const keys = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(keys, ["story-create", "story-delete"]);
});

Deno.test("index: exports both auth methods and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["delivery-token", "management-token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "api"]);
});

/** Every regional host, and nothing else. */
Deno.test("index: the manifest names the five regions' hosts", () => {
  assertEquals(manifest.w6w.network.allow, [
    "api.storyblok.com",
    "api-us.storyblok.com",
    "api-ca.storyblok.com",
    "api-ap.storyblok.com",
    "mapi.storyblok.com",
    "app.storyblokchina.cn",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.storyblok");
  assertEquals(manifest.w6w.categories, ["cms", "marketing"]);
});

/**
 * Storyblok's answer to a wrong credential is a bare `Unauthorized`, so every
 * action must refuse before the request rather than after.
 */
Deno.test("index: every action asserts which credential it needs", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    assert(
      /assertCredential\(ctx\.connection, "(delivery|management)"\)/.test(src),
      `${entry.name} does not assert its credential kind`,
    );
  }
});

/** Writing content without checking its shape is how empty blocks get made. */
Deno.test("index: the two content-writing actions validate the shape first", async () => {
  for (const name of ["story-create", "story-update"]) {
    const src = await Deno.readTextFile(new URL(`../actions/${name}.ts`, import.meta.url));
    assert(/validateContent\(/.test(src), `${name} does not validate the content shape`);
  }
});

/** Deleting a folder is a bulk deletion; moving changes a URL. */
Deno.test("index: the destructive actions gate themselves", () => {
  const remove = app.actions.find((a) => a.key === "story-delete")!;
  const params = remove.params as Array<{ key: string; required?: boolean }>;
  assertEquals(params.find((p) => p.key === "confirm")?.required, true);
  assert(params.some((p) => p.key === "allowFolder"), "no gate on deleting a folder");
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
      !/\bcredential\s*(?:\.|;|\)|\}|,|as\b)/i.test(src.replace(/assertCredential\(/g, "")),
      `${entry.name} reads the credential`,
    );
    // The delivery token lives in the query string, so this one matters here.
    assert(!/searchParams\.set\("token"/.test(src), `${entry.name} sets the delivery token`);
  }
});

/** Story content is the customer's copy, and some of it is unpublished. */
Deno.test("index: no action logs story content", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [
          /:\s*(?:content|story|stories|assets|components|map|entries)\s*[,}]/i,
          /[{,]\s*(?:content|story|stories|assets|components|map|entries)\s*[,}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs content: ${object}`);
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
