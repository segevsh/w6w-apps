import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    appearance: { icon: { svg?: string } };
    categories: string[];
  };
};

Deno.test("index: exports 23 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 23);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Anything that sends an email/SMS or creates a new submission/template on every call. */
Deno.test("index: the actions that duplicate or notify on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "submission-create",
    "submission-create-from-docx",
    "submission-create-from-emails",
    "submission-create-from-html",
    "submission-create-from-pdf",
    "template-clone",
    "template-create-from-docx",
    "template-create-from-html",
    "template-create-from-pdf",
    "template-documents-update",
    "template-merge",
  ]);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: the manifest names exactly the two documented DocuSeal hosts", () => {
  assertEquals(manifest.w6w.network.allow.sort(), ["api.docuseal.com", "api.docuseal.eu"]);
  assertEquals(manifest.w6w.id, "io.w6w.docuseal");
});

Deno.test("index: 1-3 categories, all from the controlled vocabulary", () => {
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assertEquals(manifest.w6w.categories, ["documents", "legal", "productivity"]);
});

Deno.test("index: the icon is the verified vendor svg", () => {
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

/** The sandbox rules that can only be seen in source. */
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
    assert(!/x-auth-token/i.test(src), `${entry.name} sets the auth header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// x-auth-token\nconst a = 1;").trim(), "const a = 1;");
});
