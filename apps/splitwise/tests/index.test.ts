import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { PUBLIC_ENDPOINTS } from "../lib/client.ts";

const ACTION_COUNT = 26;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
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
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Splitwise offers no idempotency key on any endpoint, so a retry of any of
 * these is a second real record: a duplicate expense that counts against
 * everyone's balance, a duplicate comment in a thread people read, a second
 * invited placeholder user, a second group with the same name.
 */
const NOT_IDEMPOTENT = [
  "create-expense-equal",
  "create-expense-by-shares",
  "create-group",
  "create-friend",
  "create-comment",
  "add-user-to-group",
];

/**
 * The converse, and the reason the list above is not just caution: these
 * converge on the same state when applied twice, and saying so is what lets the
 * runtime recover from a dropped connection instead of failing the run.
 */
const IDEMPOTENT = [
  "delete-group",
  "undelete-group",
  "remove-user-from-group",
  "delete-friend",
  "update-expense",
  "delete-expense",
  "undelete-expense",
  "delete-comment",
];

/**
 * The two lists above must PARTITION the perform set — derived from `app`, not
 * counted by hand. Without this a new perform action could be added with no
 * considered flag and both lists would still pass, which is precisely how an
 * unreviewed `idempotent: true` on a duplicate-creating write ships.
 */
Deno.test("index: the two idempotency lists partition the perform set exactly", () => {
  const performs = app.actions.filter((a) => a.type === "perform").map((a) => a.key).sort();
  assertEquals(
    [...NOT_IDEMPOTENT, ...IDEMPOTENT].sort(),
    performs,
    "a perform action is in neither list (or in both) — classify it deliberately",
  );
  assert(performs.length > 0, "no perform actions — this test would pass vacuously");
});

Deno.test("index: nothing that creates a duplicate record is marked idempotent", () => {
  for (const key of NOT_IDEMPOTENT) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: the genuinely-convergent performs are marked idempotent", () => {
  for (const key of IDEMPOTENT) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
      for (const child of p.item?.fields ?? []) {
        assert(
          typeof child.key === "string" && child.key.length > 0,
          `${a.key}/${p.key}: array item field without a key`,
        );
        assert(
          typeof child.label === "string" && child.label.length > 0,
          `${a.key}/${p.key}/${child.key}: no label`,
        );
      }
    }
  }
});

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

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: the comment stripper actually strips, so the guards below mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});

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
 * the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/splitwise\.com/.test(src), `${a.key}: contains a Splitwise host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account|password)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the soft-failure invariant, derived rather than listed -------------------

/**
 * Splitwise's own reference says "200 OK does not indicate a successful
 * response" for six endpoints, and answers a failed write with a populated
 * `errors` object or `success: false` regardless. An action that reached a
 * response without going through `SplitwiseClient` would report those as
 * successes.
 *
 * The set is derived from every action's own source, so a new action that
 * hand-rolls a request fails here rather than shipping.
 */
Deno.test("index: every action goes through SplitwiseClient — nothing hand-rolls a request", async () => {
  const offenders: string[] = [];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (!/new SplitwiseClient\(ctx\)/.test(src)) offenders.push(a.key);
  }
  assertEquals(offenders, [], `actions not using the client: ${offenders.join(", ")}`);
  // A derivation that found nothing would pass vacuously.
  assertEquals(app.actions.length, ACTION_COUNT);
});

/**
 * Every path an action builds, with `${…}` interpolations collapsed to `{}`,
 * derived from source rather than hand-listed.
 */
function requestPaths(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:`(\/[^`]*)`|"(\/[^"]*)")/g)) {
    const literal = m[1] ?? m[2];
    out.push(literal.replace(/\$\{[^}]*\}/g, "{}"));
  }
  return out;
}

Deno.test("index: the request-path derivation actually finds paths", () => {
  assertEquals(requestPaths('const p = "/get_current_user";'), ["/get_current_user"]);
  assertEquals(requestPaths("const p = `/get_expense/${id}`;"), ["/get_expense/{}"]);
});

/**
 * The two endpoints that answer without a credential are reachable as Actions —
 * usefully so, and declared `requiresAuth: false` because that was measured.
 * The invariant runs both ways: exactly the actions touching a public endpoint
 * declare the flag, and no other action does.
 */
Deno.test("index: exactly the actions on a public endpoint declare requiresAuth false", async () => {
  const touching: string[] = [];
  const declaring: string[] = [];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (requestPaths(src).some((p) => PUBLIC_ENDPOINTS.includes(p as "/get_currencies"))) {
      touching.push(a.key);
    }
    if (a.requiresAuth === false) declaring.push(a.key);
  }
  assertEquals(
    touching.slice().sort(),
    declaring.slice().sort(),
    `on a public endpoint: ${touching.sort().join(", ")} · declaring: ${
      declaring.sort().join(", ")
    }`,
  );
  assertEquals(touching.length, 2, `expected 2 public actions, found ${touching.length}`);
});

/**
 * The `users__{index}__{property}` encoding lives in `lib/shares.ts` and nowhere
 * else. A second, hand-built copy in an action is how the two forms drift, and
 * `update_expense` overwriting *all* shares makes a drift there silent data
 * loss rather than a validation difference.
 */
Deno.test("index: no action builds the flattened share encoding by hand", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/users__/.test(src), `${a.key}: hand-builds a users__i__prop key`);
  }
  const shares = code(await Deno.readTextFile(new URL("../lib/shares.ts", import.meta.url)));
  assert(/users__\$\{index\}__/.test(shares), "lib/shares.ts no longer builds the encoding");
});

// --- auth ------------------------------------------------------------------

/**
 * The auth probe is pinned by path. Choosing it is the step where a probe most
 * easily proves nothing: `get_currencies` and `get_categories` answer 200 with
 * their full payload and NO credential (measured 2026-08-11), so a Connection
 * whose key was dropped would pass against either. If someone swaps the probe,
 * this makes them do it deliberately.
 */
Deno.test("index: the auth probe is get_current_user", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(
    /PROBE_PATH\s*=\s*"\/get_current_user"/.test(src),
    "the auth probe is no longer /get_current_user",
  );
  for (const path of PUBLIC_ENDPOINTS) {
    assert(!src.includes(path), `the auth probe references the public endpoint ${path}`);
  }
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "bearer");
  assertEquals((method.fields ?? []).length, 1);
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
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
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the key. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

/**
 * Splitwise's API key IS the account — there is no scoped token — so no health
 * check may be signed. Every question this app's health surface asks is
 * answerable without spending the credential it monitors.
 */
Deno.test("index: no health check is signed", () => {
  for (const h of app.healthChecks) {
    assert(h.credential !== "signed", `${h.key}: probes with the account's full-access API key`);
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { url: string; alt: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.splitwise");
  assertEquals(manifest.w6w.network.allow, ["secure.splitwise.com"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.splitwise.com"));
  // 127.0.0.1 is not called by anything here and must never be declared.
  assert(!manifest.w6w.network.allow.includes("127.0.0.1"));
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(manifest.w6w.appearance.icon.alt, "Splitwise");
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
});

/**
 * Downloaded verbatim from `https://www.splitwise.com/apple-touch-icon.png` on
 * 2026-08-11: 4,460 bytes, md5 `41878b0394ff2e4c84253fe8705a89d2`, a 180x180
 * 8-bit colormap PNG. The byte count and the PNG signature together catch both
 * a re-export (which changes the size) and a redraw.
 */
Deno.test("index: the icon is the vendor's own file, byte-for-byte", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  assertEquals(bytes.length, 4460, "icon.png is no longer the 4,460-byte vendor file");
  assertEquals(
    [...bytes.slice(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    "not a PNG",
  );
  // IHDR width/height, big-endian at offsets 16 and 20.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assertEquals(view.getUint32(16), 180, "icon width changed");
  assertEquals(view.getUint32(20), 180, "icon height changed");
});
