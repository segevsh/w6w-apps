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

Deno.test("index: exports 18 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 18);
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
 * A streaming insert without insertIds duplicates on retry, and a job without a
 * supplied id starts a second job. Both offer an opt-in and both are honest
 * about the default.
 */
Deno.test("index: the two writes that can duplicate on retry say so", () => {
  assertEquals(app.actions.find((a) => a.key === "rows-insert")!.idempotent, false);
  assertEquals(app.actions.find((a) => a.key === "job-insert")!.idempotent, false);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["oauth2"]);
  assertEquals((app.healthChecks ?? []).map((c) => c.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest allowlists exactly the one API host", () => {
  assertEquals(manifest.w6w.id, "io.w6w.bigquery");
  assertEquals(manifest.w6w.network.allow, ["bigquery.googleapis.com"]);
  // `www.googleapis.com` is the scope-URN namespace, never fetched — allowing
  // it would widen the sandbox to every Google service.
  assert(!manifest.w6w.network.allow.includes("www.googleapis.com"));
  assert(!manifest.w6w.network.allow.includes("status.cloud.google.com"));
  assertEquals(manifest.w6w.categories, ["data-warehousing", "databases"]);
});

/** Legacy SQL changes what a query means rather than failing, so never enable it. */
Deno.test("index: query-run pins standard SQL", async () => {
  const src = await Deno.readTextFile(new URL("../actions/query-run.ts", import.meta.url));
  assert(src.includes("useLegacySql: false"), "query-run does not pin standard SQL");
  assert(
    !app.actions.find((a) => a.key === "query-run")!.params!.some((p) => p.key === "useLegacySql"),
    "legacy SQL must not be an option",
  );
});

/** A blank field must not resolve to the connection's default and delete it. */
Deno.test("index: dataset-delete never falls back to the connection's dataset", async () => {
  const src = await Deno.readTextFile(new URL("../actions/dataset-delete.ts", import.meta.url));
  const body = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert(!body.includes("resolveDataset"), "dataset-delete must require an explicit dataset");
});

Deno.test("index: the icon is the vendor's mark, in the vendor's colour", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Google BigQuery</title>"), "the mark no longer names BigQuery");
  assert(svg.includes('fill="#669DF6"'), "the mark lost BigQuery's brand blue");
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
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
