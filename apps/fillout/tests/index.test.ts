import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 8;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
});

/**
 * The action set is derived from the directory, not hand-listed, so an action
 * file that was written but never wired into `index.ts` fails here instead of
 * shipping invisible.
 */
Deno.test("index: every file in actions/ is wired into the entry module, and vice versa", async () => {
  const files: string[] = [];
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (entry.isFile && entry.name.endsWith(".ts")) files.push(entry.name.replace(/\.ts$/, ""));
  }
  assertEquals(files.length, ACTION_COUNT, `actions/ holds ${files.length} files`);
  assertEquals(files.slice().sort(), app.actions.map((a) => a.key).slice().sort());
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  assertEquals(performs.length, 4, "expected 4 perform actions");
  for (const a of performs) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Fillout offers no idempotency key, no client-supplied submission id and no
 * upsert mode anywhere in its request schemas, and no dedupe on a webhook URL.
 * A retry of either of these creates a second thing — a duplicated import, or a
 * second subscription delivering every submission twice.
 */
Deno.test("index: the two creating actions are NOT marked idempotent", () => {
  for (const key of ["submission-create", "webhook-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just caution: these two
 * name an exact resource and leave the same end state after two calls as after
 * one, so saying so is what lets the runtime recover from a dropped connection
 * instead of failing the run.
 */
Deno.test("index: the two by-id deletions are marked idempotent", () => {
  for (const key of ["submission-delete", "webhook-delete"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

// --- source guards ----------------------------------------------------------

/**
 * Strip comments so the sandbox guards below scan CODE, not prose.
 *
 * Without this the checks are simultaneously too weak and too strong: a doc
 * comment explaining *why* an action never touches the credential trips the
 * assertion, while a reviewer's natural fix — deleting the explanation — would
 * leave a real violation just as invisible.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Also strip user-facing prose fields, mirroring `_tools/audit.ts` exactly.
 * A `hint:` or `placeholder:` naming a URL is documentation shown in a form,
 * not a request the app makes.
 */
function codeOnly(src: string): string {
  return code(src).replace(
    /\b(?:hint|description|placeholder|label|title|subtitle):\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)(?:\s*\+\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`))*/g,
    "",
  );
}

const readSource = (rel: string) => Deno.readTextFile(new URL(`../${rel}`, import.meta.url));
const actionSource = async (key: string) => code(await readSource(`actions/${key}.ts`));

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/api[_-]?key/i.test(src), `${a.key}: touches an API key`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/**
 * The API origin lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host — or accepted one as a param — could be pointed somewhere
 * the manifest never allowlisted, and would also ignore the Connection's
 * region.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = codeOnly(await readSource(`actions/${a.key}.ts`));
    assert(!/fillout\.com/.test(src), `${a.key}: contains a Fillout host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

/**
 * Every hostname-shaped string literal in a directory's code, prose fields
 * excluded. Hosts are built as bare names here (`apiHost()` returns
 * `"api.fillout.com"`, the scheme is added at the call site), so the derivation
 * looks for the names rather than for `https://…` literals — which, being
 * template expressions, contain no host at all.
 */
async function hostLiterals(dir: string): Promise<Set<string>> {
  const found = new Set<string>();
  for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
    if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
    const src = codeOnly(await readSource(`${dir}/${entry.name}`));
    for (const m of src.matchAll(/["'`]([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})["'`]/gi)) {
      found.add(m[1]);
    }
    // …and any host that survives inside an absolute URL literal.
    for (const m of src.matchAll(/https?:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})/gi)) {
      found.add(m[1]);
    }
  }
  return found;
}

/**
 * Egress, derived rather than asserted by hand: the set of hosts the sandboxed
 * code names must be exactly the manifest's allowlist — both directions, so a
 * host that is called but undeclared and a host that is declared but never
 * called are each a failure.
 */
Deno.test("index: the manifest allowlist is exactly the host set the sandboxed code names", async () => {
  const manifest = JSON.parse(await readSource("package.json")) as {
    w6w: { network: { allow: string[] } };
  };
  const found = new Set<string>();
  for (const dir of ["actions", "auth", "lib"]) {
    for (const host of await hostLiterals(dir)) found.add(host);
  }
  // A derivation that found nothing would pass vacuously.
  assert(found.has("api.fillout.com"), "the host derivation found no API host — it is blind");
  assertEquals(
    [...found].sort(),
    [...manifest.w6w.network.allow].sort(),
    "sandboxed code hosts != w6w.network.allow",
  );
});

/**
 * The status host is reached only by the `service` check, so it belongs to that
 * check's own allowlist and must NOT widen the app's. Derived the same way, so
 * the day someone moves a status fetch into `lib/` the test above fails instead
 * of this one passing quietly.
 */
Deno.test("index: the status host lives in the check's allowlist, never the app's", async () => {
  const manifest = JSON.parse(await readSource("package.json")) as {
    w6w: { network: { allow: string[] } };
  };
  const healthHosts = await hostLiterals("health");
  assert(healthHosts.has("fillout.statuspage.io"), "the health derivation found no status host");
  for (const host of healthHosts) {
    if (manifest.w6w.network.allow.includes(host)) continue;
    const declared = app.healthChecks.some((h) => h.network?.allow?.includes(host));
    assert(declared, `${host} is named in health/ but declared in no check's network.allow`);
    assert(
      !manifest.w6w.network.allow.includes(host),
      `${host} must not be in the app-wide allowlist`,
    );
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|region|base_?url|api_?key|api_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth ------------------------------------------------------------------

Deno.test("index: the credential field is declared secret and the region field is not", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "bearer");
  const fields = Object.fromEntries((method.fields ?? []).map((f) => [f.key, f]));
  assertEquals(fields.apiKey?.type, "secret");
  assertEquals(fields.region?.type, "select");
  assertEquals((fields.region?.options as Array<{ value: string }>).map((o) => o.value), [
    "us",
    "eu",
  ]);
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

/**
 * The auth probe is pinned by path.
 *
 * `GET /forms` is the only endpoint of Fillout's eight that needs no id it does
 * not already have and has no side effect: the other seven either require a
 * `formId` (which you get from this call) or delete something. It also returns
 * nothing secret — the schema is `{name, formId}` and `formId` is the public id
 * already in every share link.
 */
Deno.test("index: the auth probe is /forms", async () => {
  const src = code(await readSource("auth/api-key.ts"));
  assert(
    /PROBE_PATH\s*=\s*["'`]\/forms["'`]/.test(src),
    "the auth probe is no longer GET /forms",
  );
});

/**
 * The trap this API is built out of: EVERY credential failure is a `400`, and
 * so are things that have nothing to do with the credential — `POST
 * /forms/{id}/submissions` validates its body first and answers a `400` Zod
 * list with no auth involved. So no verdict here may be derived from the status
 * code.
 */
Deno.test("index: no auth or health code decides a credential verdict from a status code", async () => {
  for (const dir of ["auth", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(await readSource(`${dir}/${entry.name}`));
      assert(
        !/status\s*[!=]==?\s*400/.test(src),
        `${dir}/${entry.name}: branches on a bare 400, which on this API means five different things`,
      );
    }
  }
});

// --- health ----------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so at any severity but `informational` a declared absence
 * pins the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assertEquals(unavailable.length, 1, "expected exactly one declared absence");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the key. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assertEquals(widening.length, 1, "expected exactly one check to widen egress");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows both API hosts and not the status host", async () => {
  const manifest = JSON.parse(await readSource("package.json")) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string; alt: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.fillout");
  assertEquals(manifest.w6w.categories, ["forms", "productivity"]);
  assertEquals(manifest.w6w.network.allow, ["api.fillout.com", "eu-api.fillout.com"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("fillout.statuspage.io"));
  assert(!manifest.w6w.network.allow.includes("status.zite.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assertEquals(manifest.w6w.appearance.icon.alt, "Fillout");
});

Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const svg = await readSource("assets/icon.svg");
  // The square icon from Fillout's own brand page
  // (https://www.fillout.com/brand → /fillout-icon.svg), taken on 2026-08-15 and
  // re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`. It
  // replaces the simple-icons export, which was the bare wordmark: 4:1, and a
  // strip of text on a square tile. Fillout's yellow carries both themes on its
  // own, so the reversed variant this app used to ship is retired.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Fillout</title>"), "the icon's title is not Fillout's");
  for (const colour of ["#FFC738", "#071003"]) {
    assert(svg.includes(colour), `Fillout brand colour ${colour} missing — the mark was redrawn`);
  }
});

// --- the guards' own guards -------------------------------------------------

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});

Deno.test("index: the prose stripper removes form copy but not request code", () => {
  // The exact placeholder `actions/webhook-create.ts` ships.
  assertEquals(
    codeOnly('placeholder: "https://example.com/hooks/fillout",').trim(),
    ",",
  );
  assertEquals(
    codeOnly('hint: "see https://api.fillout.com" + "/v1/api",').trim(),
    ",",
  );
  // A real request literal must survive, or the egress derivation is blind.
  assert(
    codeOnly("const u = `https://${apiHost(r)}/v1/api`;").includes("apiHost"),
    "the prose stripper ate a request expression",
  );
  assert(
    codeOnly('export const STATUS_URL = "https://fillout.statuspage.io/api/v2/summary.json";')
      .includes("fillout.statuspage.io"),
    "the prose stripper ate a host literal it must not",
  );
});
