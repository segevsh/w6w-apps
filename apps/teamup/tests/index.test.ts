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

Deno.test("index: exports 29 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 29);
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

/** Creating a record twice makes two records; registering twice does not. */
Deno.test("index: only the non-deduplicable actions are marked non-idempotent", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "checkins-create",
    "customer-memberships-create",
    "customers-create",
    "events-create",
  ]);
});

/** Docs say the same thing in three files, or they do not say it at all. */
Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["host", "quota"]);
});

/** There is no `service` check: the vendor status page is abandoned. */
Deno.test("index: declares no `service` health check", () => {
  assertEquals(app.healthChecks!.filter((h) => h.kind === "service"), []);
});

Deno.test("index: the manifest names only the API host", () => {
  assertEquals(manifest.w6w.network.allow, ["goteamup.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.teamup");
  assertEquals(manifest.w6w.categories, ["crm", "calendar", "commerce"]);
});

/** The real vendor mark, in ImageObject's vector slot. */
Deno.test("index: the icon is the vendor's own svg under `svg`", async () => {
  const icon = manifest.w6w.appearance.icon;
  assertEquals(icon.svg, "./assets/icon.svg");
  assertEquals(icon.url, undefined);
  assertEquals(icon.alt, "TeamUp");
  const stat = await Deno.stat(new URL("../assets/icon.svg", import.meta.url));
  assert(stat.isFile, "assets/icon.svg is missing");
});

/** The four controls TeamUp documents on nearly every operation. */
Deno.test("index: every action exposes the four shared controls", () => {
  for (const a of app.actions) {
    const keys = new Set((a.params ?? []).map((p) => p.key));
    for (const key of ["providerId", "expand", "fields", "format"]) {
      assert(keys.has(key), `${a.key} does not expose \`${key}\``);
    }
  }
});

/** Offset pagination, defaulted and capped the way TeamUp documents it. */
Deno.test("index: every list action pages the way TeamUp documents", () => {
  const lists = app.actions.filter((a) => a.type === "search");
  assertEquals(lists.length, 13);
  for (const a of lists) {
    const page = a.params!.find((p) => p.key === "page")!;
    const size = a.params!.find((p) => p.key === "page_size")!;
    assertEquals(page.default, 1, a.key);
    assertEquals(size.default, 100, a.key);
    assertEquals(size.validation?.max, 100, a.key);
  }
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

/** Actions go through the client, so no action may name a host or a path prefix. */
Deno.test("index: no action hardcodes a host", async () => {
  for (const [name, src] of await actionFiles()) {
    assert(!/https?:\/\//.test(code(src)), `${name} contains a URL`);
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
    assert(!/\btoken\b/i.test(stripped), `${name} touches a token`);
    assert(!/secret/i.test(stripped), `${name} touches a secret`);
  }
});

/**
 * TeamUp (goteamup.com), not the unrelated Teamup Calendar product — and no
 * action reaches the vendor's documentation or status hosts either.
 */
Deno.test("index: no action reaches the documentation or status hosts", async () => {
  for (const [name, src] of await actionFiles()) {
    const stripped = code(src);
    assert(!/status\.goteamup\.com/.test(stripped), `${name} names the status host`);
    assert(!/docs\.goteamup\.com/.test(stripped), `${name} names the documentation host`);
    assert(!/calendar\.teamup\.com/i.test(src), `${name} names the Teamup Calendar product`);
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
