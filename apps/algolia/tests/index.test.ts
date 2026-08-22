import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { svg: string }; darkMode?: unknown };
  };
};

Deno.test("index: exports 22 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 22);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  const validTypes = new Set(["read", "search", "perform", "control"]);
  for (const action of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), `bad key: ${action.key}`);
    assert(validTypes.has(action.type), `bad type on ${action.key}`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key} missing idempotent flag`);
    }
  }
});

/**
 * Two writes are honestly NOT idempotent and the reasons differ: `object-add`
 * lets Algolia mint an objectID, so a retry can duplicate; `object-update`
 * supports Increment/Decrement operations, which compound on a retry.
 */
Deno.test("index: the two writes that cannot be safely replayed say so", () => {
  assertEquals(app.actions.find((a) => a.key === "object-add")!.idempotent, false);
  assertEquals(app.actions.find((a) => a.key === "object-update")!.idempotent, false);
  // Keyed on an objectID, so replaying lands the same record.
  assertEquals(app.actions.find((a) => a.key === "object-save")!.idempotent, true);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["api-key"]);
  assertEquals((app.healthChecks ?? []).map((c) => c.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest allows the per-application host wildcards", () => {
  assertEquals(manifest.w6w.id, "io.w6w.algolia");
  // The host is {appId}.algolia.net, so no manifest can enumerate them.
  assertEquals(manifest.w6w.network.allow, ["*.algolia.net", "*.algolianet.com"]);
  // The status host belongs to the service check's own allowlist.
  assert(!manifest.w6w.network.allow.includes("status.algolia.com"));
  assertEquals(manifest.w6w.categories, ["search", "developer-tools"]);
});

/**
 * A third of Algolia's spec paths are `x-helper: true` — SDK methods, not HTTP
 * routes. `GET /saveObjects` is declared in the document and does not exist on
 * the wire. Every real endpoint lives under `/1/`.
 */
Deno.test("index: every action calls a real /1/ endpoint, never an SDK helper", async () => {
  const helpers = [
    "/saveObjects",
    "/browseObjects",
    "/replaceAllObjects",
    "/partialUpdateObjects",
    "/deleteObjects",
    "/chunkedBatch",
    "/waitForTask",
    "/waitForApiKey",
    "/waitForAppTask",
    "/generateSecuredApiKey",
    "/indexExists",
    "/accountCopyIndex",
    "/setClientApiKey",
  ];
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    // Only the request paths matter, so look at the template literals.
    const paths = [...src.matchAll(/request\(\s*[`"]([^`"]+)/g)].map((m) => m[1]);
    assert(paths.length > 0, `${entry.name} makes no request`);
    for (const p of paths) {
      assert(p.startsWith("/1/"), `${entry.name} calls ${p}, which is not a /1/ endpoint`);
      for (const h of helpers) {
        assert(!p.startsWith(h), `${entry.name} calls the SDK helper ${h}`);
      }
    }
  }
});

/** Reads belong on the DSN host; writes must not go there. */
Deno.test("index: only read-shaped actions use the read transporter", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const key = entry.name.replace(/\.ts$/, "");
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const action = app.actions.find((a) => a.key === key)!;
    if (/read:\s*true/.test(src)) {
      assert(
        action.type === "read" || action.type === "search",
        `${key} reads from the DSN host but is a ${action.type}`,
      );
    }
  }
});

Deno.test("index: the icon is the vendor's mark, in the vendor's colour", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Algolia</title>"), "the mark no longer names Algolia");
  assert(svg.includes("M12 0C5.445 0"), "the vendor's geometry changed");
  assert(svg.includes('fill="#003DFF"'), "the mark lost Algolia's brand blue");
  // The blue clears both tiles, so no reversed variant is needed.
  assertEquals(manifest.w6w.appearance.darkMode, undefined);
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

Deno.test("index: no action reaches the network except through ctx.fetch", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(
      !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
      `${entry.name} calls global fetch`,
    );
    assert(!/\bDeno\./.test(src), `${entry.name} touches Deno.*`);
  }
});

Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/x-algolia-api-key/i.test(src), `${entry.name} stamps the API key`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// x-algolia-api-key\nconst a = 1;").trim(), "const a = 1;");
});
