import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { STATUS_URL } from "../health/service.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 14);
  assertEquals(app.auth.length, 2);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares type, resource, description, output and execute", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(typeof a.resource === "string" && a.resource.length > 0, `${a.key}: no resource`);
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

Deno.test("index: every param declares a label and a type", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
      assert(typeof p.type === "string" && p.type.length > 0, `${a.key}/${p.key}: no type`);
    }
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose.
 *
 * Without this the checks are simultaneously too weak and too strong: a doc
 * comment explaining *why* an action never touches the credential trips the
 * assertion, while a reviewer's natural fix — deleting the explanation — would
 * leave a real violation just as invisible. Scanning only executable text makes
 * the guard mean what it says.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

Deno.test("index: the comment stripper actually strips", () => {
  assertEquals(code("/** credential */ const a = 1;").includes("credential"), false);
  assertEquals(code("// authorization\nconst a = 1;").includes("authorization"), false);
  // …and must not eat the `://` of a URL literal, which would defeat the
  // absolute-URL guard below.
  assert(code('const u = "https://api.buffer.com";').includes("https://api.buffer.com"));
});

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

async function allSource(dir: string): Promise<Array<[string, string]>> {
  const base = new URL(`../${dir}/`, import.meta.url);
  const out: Array<[string, string]> = [];
  for await (const entry of Deno.readDir(base)) {
    if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
    out.push([`${dir}/${entry.name}`, code(await Deno.readTextFile(new URL(entry.name, base)))]);
  }
  return out;
}

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer scheme itself`);
    assert(!/\bbtoa\b|encodeBase64/.test(src), `${a.key}: builds a credential itself`);
  }
});

Deno.test("index: no action reaches the network except through BufferClient", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls fetch directly`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL literal`);
    assert(src.includes("BufferClient"), `${a.key}: does not use the shared client`);
  }
});

Deno.test("index: no action exposes the credential as a param", () => {
  const banned = ["apikey", "accesstoken", "token", "password", "secret", "clientsecret"];
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(
        !banned.includes(p.key.toLowerCase()),
        `${a.key}: declares a credential-ish param "${p.key}"`,
      );
      assert(p.type !== "secret", `${a.key}/${p.key}: an action must not collect a secret`);
    }
  }
});

/**
 * The Buffer-specific half of the credential rule.
 *
 * Nothing in Buffer's schema echoes a token, key or password back to the caller
 * — that was checked across all 216 documented types, and it is worth stating
 * positively because it is not the norm (the sibling `followupboss` app has to
 * ban `GET /me`, which returns the caller's own `apiKey`, and Mailjet's
 * `/v3/REST/apikey` returns a key *and* its secret).
 *
 * What Buffer's `Account` type does expose is `email`, `backupEmail` and
 * `connectedApps` — the account holder's addresses and an enumeration of every
 * other OAuth integration they have authorised, with `clientId`, `name` and
 * `website` for each. None of it is secret; none of it belongs in a liveness
 * probe or a health check either, and the smallest query that proves a
 * credential works is `{ account { id } }`.
 *
 * So this guard keeps those three fields out of everything that runs
 * unattended: `auth/`, `health/` and the shared `lib/identity.ts`. `account-get`
 * is exempt by construction — it lives in `actions/`, `email` is behind an
 * explicit opt-in there, and `connectedApps` is not selected at all (asserted
 * separately below).
 */
Deno.test("index: no unattended hook queries account email or connectedApps", async () => {
  const files = [...await allSource("auth"), ...await allSource("health")];
  files.push([
    "lib/identity.ts",
    code(
      await Deno.readTextFile(new URL("../lib/identity.ts", import.meta.url)),
    ),
  ]);
  for (const [name, src] of files) {
    assert(!/\bbackupEmail\b/.test(src), `${name}: selects backupEmail`);
    assert(!/\bconnectedApps\b/.test(src), `${name}: selects connectedApps`);
    assert(!/\bemail\b/.test(src), `${name}: selects an email field`);
  }
});

Deno.test("index: the probe/PII guard would catch an actual selection", () => {
  const guard = (src: string) => /\bconnectedApps\b|\bbackupEmail\b|\bemail\b/.test(src);
  assert(guard("query { account { id email } }"));
  assert(guard("account { connectedApps { clientId } }"));
  assert(!guard("query { account { id name } }"));
});

Deno.test("index: no action selects connectedApps", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/\bconnectedApps\b/.test(src), `${a.key}: selects connectedApps`);
  }
});

/**
 * The 200-that-means-failure guard.
 *
 * Buffer delivers mutation failures inside `data` with HTTP 200 and no `errors`
 * array. The only defence is that every mutation selects `__typename` plus a
 * `MutationError` catch-all and goes through `BufferClient.mutate`, which
 * throws on an unrecognised arm. A mutation that used `.request()` directly
 * would compile, run, and return an error object shaped like a result.
 */
Deno.test("index: every mutation goes through mutate() with a MutationError tail", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (!/mutation\s+W6w/.test(src)) continue;
    assert(src.includes(".mutate("), `${a.key}: runs a mutation without unwrapping the union`);
    assert(
      src.includes("MUTATION_ERROR_TAIL") || src.includes("on MutationError"),
      `${a.key}: mutation without a MutationError catch-all`,
    );
    assert(
      src.includes("MUTATION_ERROR_TAIL") || src.includes("__typename"),
      `${a.key}: mutation without __typename — mutate() cannot tell success from failure`,
    );
  }
});

Deno.test("index: no query action uses mutate(), and vice versa", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    const isMutation = /mutation\s+W6w/.test(src);
    assertEquals(
      src.includes(".mutate("),
      isMutation,
      `${a.key}: mutate() used on a query, or a mutation not unwrapped`,
    );
  }
});

Deno.test("index: auth methods are keyed, typed and carry a test hook", () => {
  const keys = app.auth.map((m) => m.key).sort();
  assertEquals(keys, ["api-key", "oauth2"]);
  for (const m of app.auth) {
    assertEquals(typeof m.test, "function", `${m.key}: no test hook`);
    assertEquals(typeof m.sign, "function", `${m.key}: no sign hook`);
    assert(m.displayName.length > 0, `${m.key}: no displayName`);
  }
});

Deno.test("index: every auth credential field of a secret kind is typed secret", () => {
  for (const m of app.auth) {
    for (const f of m.fields ?? []) {
      if (!/token|secret|password|key/i.test(f.key)) continue;
      assertEquals(f.type, "secret", `${m.key}/${f.key}: credential field not typed secret`);
    }
  }
});

Deno.test("index: health checks cover service and quota, keyed and titled", () => {
  const keys = app.healthChecks.map((h) => h.key);
  assertEquals([...keys].sort(), ["quota", "service"]);
  for (const h of app.healthChecks) {
    assert(h.title.length > 0, `${h.key}: no title`);
    assert(
      h.check !== undefined || h.unavailable !== undefined,
      `${h.key}: neither check nor unavailable`,
    );
  }
});

/**
 * An `unavailable` entry reports `unknown`, and at the default `degraded`
 * severity that would pin the app at `unknown` forever. Every declared-absent
 * check must therefore be `informational`.
 *
 * Neither check in this app is currently `unavailable` — both are live probes —
 * but the guard stays, because the failure it catches is invisible until
 * someone downgrades a check to a declaration and does not know the rule.
 */
Deno.test("index: any unavailable health check is informational", () => {
  for (const h of app.healthChecks) {
    if (!h.unavailable) continue;
    assertEquals(
      h.severity,
      "informational",
      `${h.key}: unavailable checks must be informational or they pin the app at unknown`,
    );
    assert(h.unavailable.reason.length > 0, `${h.key}: unavailable without a reason`);
  }
});

/**
 * A signed health check may not widen egress — the spec binds `network.allow`
 * to an unsigned posture, because a status host is exactly the host that must
 * never see a credential.
 */
Deno.test("index: only the unsigned service check declares its own allowlist", () => {
  for (const h of app.healthChecks) {
    const posture = h.credential ?? (h.kind === "service" ? "none" : "signed");
    if (posture === "signed") {
      assertEquals(h.network, undefined, `${h.key}: signed checks may not widen egress`);
    }
  }
  const service = app.healthChecks.find((h) => h.key === "service")!;
  assertEquals(service.network?.allow, [new URL(STATUS_URL).hostname]);
  assertEquals(service.credential, undefined, "service check must stay at the `none` default");
});

/**
 * The status host must NOT be in the app-wide allowlist — only on the one hook
 * that calls it. Read off the manifest rather than a constant, so a hand-edit
 * of `package.json` is what the test sees.
 */
Deno.test("index: package.json allows only api.buffer.com", async () => {
  const pkg = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w?: { network?: { allow?: string[] } } };
  assertEquals(pkg.w6w?.network?.allow, ["api.buffer.com"]);
});

/**
 * Buffer's experimental root fields are deliberately unimplemented. Pinned so
 * that adding one is a conscious act with a README change beside it, rather
 * than something that drifts in.
 */
Deno.test("index: no action implements one of Buffer's experimental root fields", async () => {
  const experimental = [
    "postTemplate",
    "postTemplates",
    "createPostTemplate",
    "updatePostTemplate",
    "deletePostTemplate",
    "movePostInQueue",
  ];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    for (const field of experimental) {
      assert(
        !new RegExp(`\\b${field}\\s*\\(`).test(src),
        `${a.key}: calls the experimental root field \`${field}\``,
      );
    }
  }
});
