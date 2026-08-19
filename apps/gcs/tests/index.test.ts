import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 16 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 16);
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
 * A retried create is a second bucket with a name that is globally unique, so
 * in practice a 409 — but it is the one call that means to make a new thing.
 */
Deno.test("index: only creating a bucket duplicates on a retry", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key);
  assertEquals(notIdempotent, ["bucket-create"]);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["service-account"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

/**
 * Four hosts, and each is used: storage for the API, oauth2 for the token
 * exchange, iamcredentials for signing, and the status board. The OAuth
 * *scope* looks like a fifth and is not — nothing fetches an identifier.
 */
Deno.test("index: the manifest allows the four hosts this app actually calls", () => {
  assertEquals(manifest.w6w.network.allow, [
    "storage.googleapis.com",
    "oauth2.googleapis.com",
    "iamcredentials.googleapis.com",
    "status.cloud.google.com",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.gcs");
  assertEquals(manifest.w6w.categories, ["storage", "devops"]);
  assertEquals(manifest.w6w.network.allow.includes("www.googleapis.com"), false);
});

/** The destructive and perimeter-widening paths, each gated deliberately. */
Deno.test("index: every irreversible or exposure-widening path is gated", () => {
  const params = (key: string) =>
    (app.actions.find((a) => a.key === key)!.params as Array<{ key: string }>).map((p) => p.key);

  assert(params("bucket-delete").includes("confirmName"), "bucket-delete has no gate");
  assert(params("bucket-update").includes("confirmAllowPublic"), "bucket-update has no gate");
  // A write is only safe when it can be told to refuse.
  assert(params("object-upload").includes("ifNotExists"), "object-upload offers no precondition");
  assert(
    params("object-upload").includes("ifGenerationMatch"),
    "object-upload offers no compare-and-swap",
  );
  assert(
    params("object-delete").includes("ifGenerationMatch"),
    "object-delete has no precondition",
  );
});

/** Google defaults both the other way; an automation is nobody's supervision. */
Deno.test("index: creating a bucket defaults to the closed configuration", () => {
  const create = app.actions.find((a) => a.key === "bucket-create")!
    .params as Array<{ key: string; default?: unknown }>;
  assertEquals(create.find((p) => p.key === "uniformAccess")!.default, true);
  assertEquals(create.find((p) => p.key === "publicAccessPrevention")!.default, true);
});

/** A signed URL is a bearer credential; the default lifetime is the control. */
Deno.test("index: a signed URL defaults to minutes, not the seven-day maximum", () => {
  const expiry = (app.actions.find((a) => a.key === "object-signed-url")!
    .params as Array<{ key: string; default?: unknown }>).find((p) => p.key === "expiresIn")!;
  assertEquals(expiry.default, 900);
  assert(Number(expiry.default) < 3600, "the default should be short");
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

const sources = async (dir: string) => {
  const out: Array<[string, string]> = [];
  for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    out.push([
      `${dir}/${entry.name}`,
      code(await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url))),
    ]);
  }
  return out;
};

Deno.test("index: nothing reaches the network except through ctx.fetch", async () => {
  for (const dir of ["actions", "lib", "health"]) {
    for (const [name, src] of await sources(dir)) {
      assert(
        !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "").replace(/fetchImpl\(/g, "")),
        `${name} calls global fetch`,
      );
      assert(!/\bDeno\./.test(src), `${name} touches Deno.*`);
      assert(!/from "node:/.test(src), `${name} imports a node module`);
    }
  }
});

/**
 * Including `object-signed-url`, which needs a signature and gets it from IAM
 * Credentials rather than by reading the key — that is what this asserts.
 */
Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for (const [name, src] of await sources("actions")) {
    assert(!/authorization/i.test(src), `${name} sets an authorization header`);
    assert(
      !/\bcredential\s*(?:\.|;|\)|\}|,|:|as\b)/i.test(src),
      `${name} reads the credential`,
    );
    assert(!/privateKey/.test(src), `${name} touches a private key`);
  }
});

/**
 * A signed URL is a bearer credential and object contents are the caller's
 * data. A run log records names, counts and sizes.
 */
Deno.test("index: nothing logs a URL, an object's contents or a key", async () => {
  for (const dir of ["actions", "lib"]) {
    for (const [name, src] of await sources(dir)) {
      const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
      for (const call of logs) {
        const object = call.slice(call.indexOf("{"));
        // The VALUES, not the keys: `size: content.length` is a count and
        // `content: content` is the object itself.
        for (
          const forbidden of [
            /:\s*(?:content|url|signedUrl|privateKey|body|items|objects|buckets)\s*[,}]/i,
            /[{,]\s*(?:content|url|signedUrl|privateKey|body|items|objects|buckets)\s*[,}]/i,
          ]
        ) {
          assert(!forbidden.test(object), `${name} logs a credential or a payload: ${object}`);
        }
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
