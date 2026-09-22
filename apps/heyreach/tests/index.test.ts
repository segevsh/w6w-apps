import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    categories: string[];
    appearance: { icon: { url?: string; svg?: string; alt?: string } };
  };
};

Deno.test("index: exports 30 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 30);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(
      ["read", "search", "perform"].includes(a.type),
      `${a.key} has type ${a.type}`,
    );
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
    assert(
      Array.isArray(a.output) && a.output.length > 0,
      `${a.key} declares no static output fields`,
    );
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/**
 * A retried create or send delivers twice and there is no key in the body to
 * stop it; everything else here converges on a retry (an import upserts, a
 * state change has one end state, a delete is a delete).
 */
Deno.test("index: only the non-deduplicable actions are marked non-idempotent", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "campaign-create",
    "inbox-send-message",
    "list-create",
    "webhook-create",
  ]);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["api", "service", "quota"]);
});

Deno.test("index: the manifest names only the API host", () => {
  assertEquals(manifest.w6w.network.allow, ["api.heyreach.io"]);
  assertEquals(manifest.w6w.id, "io.w6w.heyreach");
  assertEquals(manifest.w6w.categories, ["marketing", "social-media", "crm"]);
});

/** The vendor's real mark, embedded verbatim as an SVG-wrapped raster. */
Deno.test("index: the icon is an SVG wrapping the vendor PNG, with alt text", () => {
  const icon = manifest.w6w.appearance.icon;
  assertEquals(icon.svg, "./assets/icon.svg");
  assertEquals(icon.url, undefined);
  assertEquals(icon.alt, "HeyReach");
});

const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // Prose in a param hint or an output label is not code.
    .replace(
      /\b(hint|description|label|placeholder|title|reason|message)\s*:\s*"(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
      "",
    );

const actionFiles = async (): Promise<Array<[string, string]>> => {
  const out: Array<[string, string]> = [];
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    out.push([entry.name, src]);
  }
  return out;
};

Deno.test("index: no action reaches the network except through ctx.fetch", async () => {
  for (const [name, src] of await actionFiles()) {
    const stripped = code(src);
    assert(
      !/[^.\w]fetch\(/.test(stripped.replace(/ctx\.fetch\(/g, "")),
      `${name} calls global fetch`,
    );
    assert(!/\bDeno\./.test(stripped), `${name} touches Deno.*`);
  }
});

/**
 * The credential lives in exactly one hook. An action that grew a credential
 * header would take it out of the one place allowed to hold it.
 */
Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for (const [name, src] of await actionFiles()) {
    const stripped = code(src);
    assert(!/x-api-key/i.test(stripped), `${name} sets the credential header`);
    assert(!/credential/i.test(stripped), `${name} reads the credential`);
    assert(!/apiKey/i.test(stripped), `${name} touches the API key`);
  }
});

/** Every path goes through the one prefix the live host answers on. */
Deno.test("index: no action hard-codes a URL or a doubled slash", async () => {
  for (const [name, src] of await actionFiles()) {
    const stripped = code(src);
    assert(!/https:\/\//.test(stripped), `${name} embeds an absolute URL`);
    assert(!/\/\/api\/public/.test(stripped), `${name} uses the document's doubled path prefix`);
  }
});

Deno.test("index: every declared action has its own test file", async () => {
  for (const a of app.actions) {
    const url = new URL(`./actions/${a.key}.test.ts`, import.meta.url);
    const stat = await Deno.stat(url).catch(() => null);
    assert(stat?.isFile, `tests/actions/${a.key}.test.ts is missing`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  assertEquals(code('hint: "reads the credential",').trim(), ",");
});
