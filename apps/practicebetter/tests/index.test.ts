import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  name: string;
  w6w: {
    id: string;
    displayName: string;
    longDescription?: string;
    network: { allow: string[] };
    categories: string[];
    entry: string;
    appearance: { icon: { url?: string; svg?: string; alt?: string } };
  };
};

Deno.test("index: exports 26 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 26);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(
      ["read", "search", "perform"].includes(a.type),
      `${a.key} has type ${a.type}`,
    );
    assert(a.title.length > 0, `${a.key} lacks a title`);
    assert(a.description !== undefined && a.description.length > 0, `${a.key} lacks a description`);
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

/** Creating a record twice makes two records; repeating a PUT does not. */
Deno.test("index: only the creates are marked non-idempotent", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "create-client-record",
    "create-package-instance",
    "create-session",
    "create-tag",
    "create-webhook-subscription",
  ]);
});

Deno.test("index: every list action declares the shared four pagination controls and envelope", () => {
  const lists = app.actions.filter((a) => a.type === "search");
  assertEquals(lists.length, 9);
  for (const a of lists) {
    const keys = (a.params ?? []).map((p) => p.key);
    for (const key of ["after_id", "before_id", "limit", "skip"]) {
      assert(keys.includes(key), `${a.key} does not expose \`${key}\``);
    }
    assertEquals(
      (a.output as Array<{ key: string }>).map((o) => o.key),
      ["count", "hasMore", "items"],
      `${a.key} does not declare the shared envelope`,
    );
  }
});

Deno.test("index: the two bare-array reads declare the bare-array output key", () => {
  for (const key of ["list-timezones", "list-webhook-event-types"]) {
    const action = app.actions.find((a) => a.key === key)!;
    assertEquals(action.type, "read", key);
    assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), ["[]"], key);
    assertEquals(action.params, [], key);
  }
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["client-credentials"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
  assertEquals(app.healthChecks!.map((h) => h.kind), ["service", "quota"]);
});

Deno.test("index: the service check is pinned to the `Practice Better API` component", async () => {
  const service = app.healthChecks!.find((h) => h.kind === "service")!;
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.practicebetter.io"]);
  const src = await Deno.readTextFile(new URL("../health/service.ts", import.meta.url));
  assert(/API_COMPONENT_ID = "hg7zsrq27t7g"/.test(src), "component id is not pinned");
  assert(/Practice Better API/.test(src), "component name is not pinned");
});

Deno.test("index: the quota check is a declared absence at informational severity", () => {
  const quota = app.healthChecks!.find((h) => h.kind === "quota")!;
  assertEquals(quota.severity, "informational");
  assertEquals(quota.unavailable !== undefined, true);
  assertEquals(quota.check, undefined);
});

Deno.test("index: the manifest names only the two hosts the app calls", () => {
  assertEquals(manifest.w6w.network.allow, ["api.practicebetter.io", "status.practicebetter.io"]);
  assert(
    !manifest.w6w.network.allow.some((h) => h.includes("api-docs")),
    "the documentation host must never be called at runtime",
  );
  assertEquals(manifest.w6w.id, "io.w6w.practicebetter");
  assertEquals(manifest.w6w.displayName, "Practice Better");
  assertEquals(manifest.w6w.categories, ["crm", "calendar", "finance"]);
  assertEquals(manifest.w6w.entry, "./index.ts");
});

/** The real vendor mark, in ImageObject's vector slot. */
Deno.test("index: the icon is the prepared vendor mark under `svg`", async () => {
  const icon = manifest.w6w.appearance.icon;
  assertEquals(icon.svg, "./assets/icon.svg");
  assertEquals(icon.url, undefined);
  assertEquals(icon.alt, "Practice Better");
  const stat = await Deno.stat(new URL("../assets/icon.svg", import.meta.url));
  assert(stat.isFile, "assets/icon.svg is missing");
});

const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // Prose in a param hint, an output label or a message is not code.
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
    assert(!/\bprocess\.env\b/.test(stripped), `${name} touches process.env`);
  }
});

/** Actions go through the client, so no action may name a host. */
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
  }
});

Deno.test("index: no action reaches the documentation host", async () => {
  for (const [name, src] of await actionFiles()) {
    assert(!/api-docs\.practicebetter\.io/.test(src), `${name} names the documentation host`);
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
  assertEquals(code('placeholder: "https://example.com",').trim(), ",");
});
