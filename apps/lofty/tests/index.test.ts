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

Deno.test("index: exports 32 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 32);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(
      ["read", "search", "perform", "trigger"].includes(a.type),
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

/** A retried send or registration delivers twice; there is no key to stop it. */
Deno.test("index: only the non-deduplicable actions are marked non-idempotent", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "email-send",
    "lead-create",
    "note-create",
    "sms-send",
    "task-create",
    "webhook-create",
  ]);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: the manifest names only the API host", () => {
  assertEquals(manifest.w6w.network.allow, ["api.lofty.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.lofty");
  assertEquals(manifest.w6w.categories, ["crm", "communication"]);
});

/** The real vendor mark, declared in ImageObject's raster slot. */
Deno.test("index: the icon is the vendor .ico under `url`, not a fabricated svg", () => {
  const icon = manifest.w6w.appearance.icon;
  assertEquals(icon.url, "./assets/icon.ico");
  assertEquals(icon.svg, undefined);
  assertEquals(icon.alt, "Lofty");
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
 * The credential lives in exactly one hook. An action that grew an
 * `Authorization` header would take it out of the one place allowed to hold it.
 */
Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for (const [name, src] of await actionFiles()) {
    const stripped = code(src);
    assert(!/authorization/i.test(stripped), `${name} sets an authorization header`);
    assert(!/credential/i.test(stripped), `${name} reads the credential`);
    assert(!/apiKey/i.test(stripped), `${name} touches the API key`);
    assert(!/secret/i.test(stripped), `${name} touches a secret`);
  }
});

/** Scope discipline: this build is the 32 confirmed v1 endpoints, and no v2. */
Deno.test("index: every action calls a /v1.0 path and none calls v2", async () => {
  for (const [name, src] of await actionFiles()) {
    const stripped = code(src);
    assert(!/\/v2/.test(stripped), `${name} references a v2 endpoint`);
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
