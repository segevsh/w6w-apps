import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports the 21 documented actions, one auth method and four health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 21);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 4);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description, params and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
    assert(Array.isArray(a.params), `${a.key}: no params array`);
  }
});

Deno.test("index: every param has a key, a label and a known type", () => {
  const types = [
    "string",
    "text",
    "number",
    "boolean",
    "select",
    "multiselect",
    "date",
    "datetime",
    "json",
    "array",
    "group",
    "section",
  ];
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
      assert(types.includes(p.type), `${a.key}/${p.key}: unexpected type ${p.type}`);
      if (p.type === "array") {
        assert(p.item !== undefined, `${a.key}/${p.key}: array param without an item schema`);
      }
      if (p.type === "select") {
        assert(Array.isArray(p.options), `${a.key}/${p.key}: select without options`);
      }
    }
  }
});

Deno.test("index: every required param declares no empty default", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      if (p.required) {
        assertEquals(p.default, undefined, `${a.key}/${p.key}: required param with a default`);
      }
    }
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose — this app's own doc
 * comments talk at length about bearer tokens and Authorization headers.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

/** Every path an action requests, derived from its own source (backtick or plain-quoted). */
function requestPaths(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/[`"](\/[^`"\s]*)[`"]/g)) {
    out.push(m[1].replace(/\$\{[^}]*\}/g, "{}"));
  }
  return out;
}

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/\bauthorization\b/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/client[_-]?secret|api[_-]?key|access_?token/i.test(src), `${a.key}: touches a secret`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/** The API origin lives in `lib/client.ts` and nowhere else. */
Deno.test("index: no action hard-codes a host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/api\.hostaway\.com/.test(src), `${a.key}: contains a Hostaway host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned =
    /^(host|origin|domain|base_?url|api_?key|api_?token|access_?token|token|client_?id|client_?secret)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: each action issues exactly one request, and together they cover the documented paths", async () => {
  const called: string[] = [];
  for (const a of app.actions) {
    const paths = requestPaths(await actionSource(a.key));
    assertEquals(
      paths.length,
      1,
      `${a.key}: expected exactly one request path, got ${JSON.stringify(paths)}`,
    );
    called.push(paths[0]);
  }
  const documented = [
    "/amenities",
    "/conversations",
    "/conversations/{}",
    "/conversations/{}/messages",
    "/finance/report/standard",
    "/listings",
    "/listings/{}",
    "/listings/{}/calendar",
    "/propertyTypes",
    "/reservations",
    "/reservations/{}",
    "/reservations/{}/statuses/cancelled",
    "/reviews",
    "/reviews/{}",
    "/tasks",
  ];
  assertEquals([...new Set(called)].sort(), documented);
});

Deno.test("index: every request path starts at the v1 base, never an absolute URL", async () => {
  for (const a of app.actions) {
    const [path] = requestPaths(await actionSource(a.key));
    assert(path.startsWith("/"), `${a.key}: path ${path} is not relative to the v1 base`);
    assert(!path.includes("v1/"), `${a.key}: path ${path} restates the version prefix`);
  }
});

// --- auth --------------------------------------------------------------------

Deno.test("index: the credential fields are declared secret", () => {
  const [method] = app.auth ?? [];
  assertEquals(method.key, "client-credentials");
  assertEquals(method.type, "custom");
  assertEquals(method.fields?.length, 2);
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
  assertEquals(typeof method.exchange, "function");
  assertEquals(typeof method.refresh, "function");
});

Deno.test("index: the first credential field is labelled as the numeric Account ID", () => {
  const [method] = app.auth ?? [];
  const [accountId] = method.fields ?? [];
  assertEquals(accountId.key, "accountId");
  assertEquals(accountId.label, "Account ID");
  assert(/account id/i.test(accountId.hint ?? method.description ?? ""));
});

// --- health ------------------------------------------------------------------

Deno.test("index: health check keys are unique and kebab-case, and none claims the derived prefix", () => {
  const keys = (app.healthChecks ?? []).map((c) => c.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate health check key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
    assert(!key.startsWith("auth:"), `${key}: the auth: prefix is reserved for derived checks`);
  }
});

Deno.test("index: the status-page absence, the quota absence and the two probes are all declared", () => {
  const checks = new Map((app.healthChecks ?? []).map((c) => [c.key, c] as const));

  const service = checks.get("service");
  assertEquals(service?.kind, "service");
  assert(service?.unavailable !== undefined, "service: must declare the absence, not a probe");
  assertEquals(service?.check, undefined, "service: must not probe anything");
  assertEquals(service?.severity, "informational");
  assert(/status/i.test(service?.unavailable?.reason ?? ""), "service: reason does not name it");

  const quota = checks.get("quota");
  assertEquals(quota?.kind, "quota");
  assert(quota?.unavailable !== undefined, "quota: must declare the absence, not a probe");
  assertEquals(quota?.severity, "informational");

  const api = checks.get("api");
  assertEquals(api?.kind, "dependency");
  assertEquals(api?.credential, "signed");
  assertEquals(api?.scope, "connection");
  assertEquals(typeof api?.check, "function");

  const reachability = checks.get("reachability");
  assertEquals(reachability?.kind, "dependency");
  assertEquals(reachability?.credential, "none");
  assertEquals(
    reachability?.severity,
    "informational",
    "reachability: an unsigned probe must never worsen a roll-up",
  );
  assertEquals(typeof reachability?.check, "function");
});

Deno.test("index: the unsigned reachability probe never reports `down`", async () => {
  const src = code(
    await Deno.readTextFile(new URL("../health/reachability.ts", import.meta.url)),
  );
  assert(!/state:\s*"down"/.test(src), "reachability: must never return `down`");
  assert(!/api\.hostaway\.com/.test(src), "reachability: hard-codes the host outside lib/");
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows only api.hostaway.com", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string; alt: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.hostaway");
  assertEquals(manifest.w6w.network.allow, ["api.hostaway.com"]);
  assert(!manifest.w6w.network.allow.includes("127.0.0.1"));
  assert(!manifest.w6w.network.allow.includes("status.hostaway.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assertEquals(manifest.w6w.appearance.icon.alt, "Hostaway");
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  for (const category of manifest.w6w.categories) {
    assert(typeof category === "string" && /^[a-z0-9-]+$/.test(category), category);
  }
});

Deno.test("index: the icon is the real Hostaway mark that was placed for this app", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.includes('width="192"'), "icon is not the 192x192 embed that was sourced");
  assert(svg.includes("data:image/png;base64,iVBOR"), "icon is not a base64 PNG embed");
  assert(!svg.includes("data:image/svg+xml"), "icon was replaced rather than kept");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// bearer\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
