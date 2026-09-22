import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 16;
const LIST_ACTIONS = [
  "list-customers",
  "list-mandates",
  "list-payments",
  "list-subscriptions",
  "list-payouts",
  "list-refunds",
];
const CREATE_ACTIONS = [
  "create-customer",
  "create-payment",
  "create-subscription",
  "create-refund",
];

Deno.test("index: exports 16 actions, one auth method and two health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 2);
  assertEquals(app.actions.map((a) => a.key).sort(), [
    "cancel-mandate",
    "cancel-payment",
    "cancel-subscription",
    "create-customer",
    "create-payment",
    "create-refund",
    "create-subscription",
    "get-customer",
    "get-mandate",
    "get-payment",
    "list-customers",
    "list-mandates",
    "list-payments",
    "list-payouts",
    "list-refunds",
    "list-subscriptions",
  ]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description, output and execute", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
    assert(typeof a.title === "string" && a.title.length > 0, `${a.key}: no title`);
  }
});

Deno.test("index: the read/search/perform split matches what each action does", () => {
  const expected: Record<string, string> = {
    "list-customers": "search",
    "get-customer": "read",
    "create-customer": "perform",
    "list-mandates": "search",
    "get-mandate": "read",
    "cancel-mandate": "perform",
    "list-payments": "search",
    "get-payment": "read",
    "create-payment": "perform",
    "cancel-payment": "perform",
    "list-subscriptions": "search",
    "create-subscription": "perform",
    "cancel-subscription": "perform",
    "list-payouts": "search",
    "list-refunds": "search",
    "create-refund": "perform",
  };
  for (const a of app.actions) {
    assertEquals(a.type, expected[a.key], `${a.key}: wrong type`);
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

/**
 * GoCardless de-duplicates none of these: a replayed create debits again (or
 * starts a second subscription series), and a replayed cancel is the vendor's
 * `invalid_state` error. `true` anywhere here would make the runtime's own
 * retry a double charge.
 */
Deno.test("index: every perform action is explicitly not idempotent", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  assertEquals(performs.length, 7);
  for (const a of performs) {
    assertEquals(a.idempotent, false, `${a.key}: must declare idempotent: false`);
  }
});

Deno.test("index: every list action takes the shared cursor params and reports the cursors", () => {
  for (const key of LIST_ACTIONS) {
    const action = app.actions.find((a) => a.key === key)!;
    const paramKeys = (action.params ?? []).map((p) => p.key);
    for (const required of ["limit", "after", "before"]) {
      assert(paramKeys.includes(required), `${key}: missing ${required}`);
    }
    const outputKeys = (action.output as Array<{ key: string }>).map((o) => o.key);
    for (const required of ["items", "afterCursor", "beforeCursor", "limit"]) {
      assert(outputKeys.includes(required), `${key}: missing output ${required}`);
    }
  }
});

/**
 * Idempotency keys are for creating requests only. Offering one on a cancel (or
 * on a read) would imply GoCardless treats a repeat as a no-op, which it does
 * not — it answers `invalid_state`.
 */
Deno.test("index: exactly the four creating actions accept an idempotency key", () => {
  for (const a of app.actions) {
    const hasKey = (a.params ?? []).some((p) => p.key === "idempotencyKey");
    assertEquals(hasKey, CREATE_ACTIONS.includes(a.key), `${a.key}: idempotencyKey exposure`);
  }
});

Deno.test("index: the create actions require the fields GoCardless requires", () => {
  const requiredOf = (key: string) =>
    (app.actions.find((a) => a.key === key)!.params ?? [])
      .filter((p) => p.required === true)
      .map((p) => p.key)
      .sort();

  assertEquals(requiredOf("create-payment"), ["amount", "currency", "mandateId"]);
  assertEquals(requiredOf("create-refund"), ["amount", "paymentId"]);
  assertEquals(requiredOf("create-subscription"), [
    "amount",
    "currency",
    "intervalUnit",
    "mandateId",
  ]);
  // Nothing about a customer is required by the vendor, so nothing is required here.
  assertEquals(requiredOf("create-customer"), []);
});

/**
 * Manifest identity, and the egress allowlist: exactly the two API hosts. The
 * status host belongs to the `service` check's declared feed (allowlisted
 * implicitly), never to the app's own list.
 */
Deno.test("index: the manifest declares both hosts and nothing else", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    name: string;
    w6w: {
      id: string;
      displayName: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string; alt: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.gocardless");
  assertEquals(manifest.w6w.displayName, "GoCardless");
  assertEquals(manifest.w6w.categories, ["commerce", "finance"]);
  assertEquals(manifest.w6w.network.allow, [
    "api.gocardless.com",
    "api-sandbox.gocardless.com",
  ]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assertEquals(manifest.w6w.appearance.icon.alt, "GoCardless");
});

/**
 * The icon is GoCardless's own favicon mark, fetched verbatim from the URL in
 * their marketing site's `<link rel="icon">` and written to `assets/icon.svg`
 * byte-for-byte — so the check is that the vendor's artwork is still intact, not
 * that the file matches some house style.
 */
Deno.test("index: the icon is the vendor's own two-colour mark, unredrawn", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none">'),
    "icon.svg is not the vendor's 64x64 export",
  );
  assert(svg.includes('fill="#F1F252"'), "the yellow disc is missing — the mark was redrawn");
  assert(svg.includes('fill="#1C1B18"'), "the dark G is missing — the mark was redrawn");
  assert(
    svg.includes("M32.505 15.5c3.517 0 5.497.578"),
    "the vendor's path geometry changed — the mark was redrawn",
  );
  // A re-framed copy would nest another <svg> or change the viewBox.
  assertEquals(svg.includes("<svg", 1), false, "icon.svg was re-drawn or re-framed");
  assertEquals(svg.endsWith("</svg>\n") || svg.endsWith("</svg>"), true);
});

// --- source-level guards -----------------------------------------------------

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

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/gocardless-version/i.test(src), `${a.key}: stamps the API version header itself`);
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
    assert(!/gocardless\.com/.test(src), `${a.key}: contains a GoCardless host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|environment|api_?key|api_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- health checks -----------------------------------------------------------

Deno.test("index: the health surface is a real feed and a real quota read", () => {
  const keys = (app.healthChecks ?? []).map((h) => h.key);
  assertEquals(keys, ["service", "quota"]);

  for (const h of app.healthChecks ?? []) {
    assert(typeof h.check === "function", `${h.key}: no check hook`);
    // Never both, never neither — a declared absence is a different entry.
    assertEquals(h.unavailable, undefined, `${h.key}: declares an absence`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }

  const service = app.healthChecks!.find((h) => h.key === "service")!;
  assertEquals(service.kind, "service");
  assertEquals(service.feed?.url, "https://www.gocardless-status.com/history.rss");
  // GoCardless's status page is real, so this is the normal live case: the
  // kind's own `degraded` severity, not `informational`.
  assertEquals(service.severity, undefined);

  const quota = app.healthChecks!.find((h) => h.key === "quota")!;
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
  // Headroom is context, and the defensive `unknown` must not pin the app there.
  assertEquals(quota.severity, "informational");
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: no health check widens egress", () => {
  for (const h of app.healthChecks ?? []) {
    assertEquals(h.network, undefined, `${h.key}: widens egress`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
