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

/**
 * Creating a container that exists is a 409, and acquiring a lease twice is
 * too — both mean to make a new thing. Everything else converges.
 */
Deno.test("index: only creating a container and taking a lease conflict on a retry", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["blob-lease", "container-create"]);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["shared-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "account"]);
});

/** The account is the hostname, so the allowlist has to be a wildcard host. */
Deno.test("index: the manifest allows any storage account, and nothing else", () => {
  assertEquals(manifest.w6w.network.allow, [
    "*.blob.core.windows.net",
    "azurestatuscdn.azureedge.net",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.azure-blob");
  assertEquals(manifest.w6w.categories, ["storage", "devops"]);
});

/** The destructive and exposure-widening paths, each gated deliberately. */
Deno.test("index: every irreversible or exposure-widening path is gated", () => {
  const params = (key: string) =>
    (app.actions.find((a) => a.key === key)!.params as Array<{ key: string }>).map((p) => p.key);

  // Deletes a container AND every blob in it, from one call.
  assert(params("container-delete").includes("confirmName"), "container-delete has no gate");
  assert(
    params("container-delete").includes("acknowledgeBlobCount"),
    "container-delete does not make you look at the contents",
  );
  // Anonymous access, at either level.
  assert(params("container-create").includes("confirmPublic"), "container-create has no gate");
  // Makes the blob unreadable for hours and commits 180 days of billing.
  assert(params("blob-set-tier").includes("confirmArchive"), "blob-set-tier has no gate");
  // A write is only safe when it can be told to refuse.
  assert(params("blob-upload").includes("ifNotExists"), "blob-upload offers no precondition");
  assert(params("blob-upload").includes("ifMatch"), "blob-upload offers no compare-and-swap");
  assert(params("blob-delete").includes("ifMatch"), "blob-delete has no precondition");
});

/** Losing an infinite lease locks the blob until somebody breaks it by hand. */
Deno.test("index: no action offers an infinite lease", async () => {
  const lease = app.actions.find((a) => a.key === "blob-lease")!;
  const options = (lease.params as Array<{ key: string; options?: Array<{ value: string }> }>)
    .flatMap((p) => p.options ?? []);
  assertEquals(options.some((o) => o.value === "infinite"), false);
  const src = await Deno.readTextFile(new URL("../actions/blob-lease.ts", import.meta.url));
  assertEquals(/"-1"/.test(src), false, "-1 is Azure's infinite duration");
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
        !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
        `${name} calls global fetch`,
      );
      assert(!/\bDeno\./.test(src), `${name} touches Deno.*`);
      assert(!/from "node:/.test(src), `${name} imports a node module`);
      // The sandbox has no dynamic imports.
      assert(!/\bimport\s*\(/.test(src), `${name} uses a dynamic import`);
    }
  }
});

/**
 * The account key is the whole account, and Shared Key is the one scheme here
 * that signs inside the hook — so this is the guard that matters most.
 */
Deno.test("index: no action handles a credential or a key", async () => {
  for (const [name, src] of await sources("actions")) {
    assert(!/authorization/i.test(src), `${name} sets an authorization header`);
    assert(
      !/\bcredential\s*(?:\.|;|\)|\}|,|:|as\b)/i.test(src),
      `${name} reads the credential`,
    );
    assert(!/sharedKeyAuthorization|accountKey/.test(src), `${name} touches the signing key`);
  }
});

/** Blob contents are the caller's data; a run log records names and counts. */
Deno.test("index: nothing logs a blob's contents or its metadata values", async () => {
  for (const dir of ["actions", "lib"]) {
    for (const [name, src] of await sources(dir)) {
      const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
      for (const call of logs) {
        const object = call.slice(call.indexOf("{"));
        // The VALUES, not the keys: `size: content.length` is a count and
        // `content: content` is the blob itself.
        for (
          const forbidden of [
            /:\s*(?:content|body|metadata|blobs|containers|headers|key|leaseId)\s*[,}]/i,
            /[{,]\s*(?:content|body|metadata|blobs|containers|headers|key|leaseId)\s*[,}]/i,
          ]
        ) {
          assert(!forbidden.test(object), `${name} logs contents or a credential: ${object}`);
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
