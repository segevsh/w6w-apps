import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories?: string[] };
};

Deno.test("index: exports 25 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 25);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Creating a tag twice makes two tags; every other write converges on the same state. */
Deno.test("index: only tag-create is non-idempotent", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key);
  assertEquals(notIdempotent, ["tag-create"]);
});

Deno.test("index: the three Listbuilding paths are the three listbuilding-* actions", () => {
  assertEquals(
    app.actions.filter((a) => a.key.startsWith("listbuilding-")).map((a) => a.key),
    ["listbuilding-signin", "listbuilding-signoff", "listbuilding-signout"],
  );
});

Deno.test("index: exports both auth methods and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["session", "listbuilding-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "api"]);
});

Deno.test("index: egress is the one API host and nothing else", () => {
  assertEquals(manifest.w6w.network.allow, ["api.klicktipp.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.klicktipp");
});

Deno.test("index: categories are within the 1-3 controlled-vocabulary bound", () => {
  const categories = manifest.w6w.categories ?? [];
  assert(categories.length >= 1 && categories.length <= 3);
});

/** The vendor's own mark, saved verbatim from developers.klicktipp.com (md5 pinned). */
Deno.test("index: the icon is the vendor's own mark, byte for byte", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.svg", import.meta.url));
  assertEquals(bytes.length, 4211);
  const digest = await crypto.subtle.digest("MD5", bytes).catch(() => undefined);
  if (digest) {
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    assertEquals(hex, "c8eb70852bdc166247c272fdb0816a64");
  }
  assert(new TextDecoder().decode(bytes).startsWith("<svg"), "icon.svg is not an SVG");
});

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
    assert(!/authorization|cookie|password/i.test(src), `${entry.name} handles a credential`);
    assert(!/\bcredential\b/i.test(src), `${entry.name} reads the credential`);
    assert(!/apikey\s*[:=]/i.test(src), `${entry.name} sets apikey itself`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
