import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { svg: string }; darkMode?: { icon: { svg: string } } };
  };
};

Deno.test("index: exports 28 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 28);
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

Deno.test("index: exports both auth methods and both health checks", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["access-token", "oauth2"]);
  assertEquals((app.healthChecks ?? []).map((c) => c.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest allowlists exactly the one API host", () => {
  assertEquals(manifest.w6w.id, "io.w6w.vercel");
  // Vercel is SaaS-only with a single documented server, so the allowlist is
  // the narrowest form that works — no wildcard.
  assertEquals(manifest.w6w.network.allow, ["api.vercel.com"]);
  // The status host belongs to the service check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("www.vercel-status.com"));
  assertEquals(manifest.w6w.categories, ["devops", "developer-tools"]);
});

/**
 * The artwork is the vendor's, unmodified. Vercel's mark is a black triangle
 * and black IS the brand colour, so the light icon keeps it and a reversed
 * white variant carries the dark tile — the treatment Vercel's own brand
 * guidelines specify.
 */
Deno.test("index: the icon is the vendor's mark, with a dark variant", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Vercel</title>"), "the mark no longer names Vercel");
  // The path data is untouched, and it is the thing a redraw would change.
  assert(svg.includes("m12 1.608 12 20.784H0Z"), "the vendor's geometry changed");
  assert(svg.includes('fill="#000000"'), "the light mark is no longer Vercel black");

  const dark = await Deno.readTextFile(new URL("../assets/icon.dark.svg", import.meta.url));
  assert(dark.includes('fill="#ffffff"'), "the dark variant is not reversed to white");
  assertEquals(manifest.w6w.appearance.darkMode?.icon.svg, "./assets/icon.dark.svg");
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

Deno.test("index: only the endpoints that take no team scope skip it", async () => {
  // `GET /v2/teams` and `GET /v2/user` declare no `teamId` parameter in
  // Vercel's schema; every other action must thread the connection's scope.
  const scopeless = new Set(["team-list", "user-get"]);
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const key = entry.name.replace(/\.ts$/, "");
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    if (scopeless.has(key)) {
      assert(!src.includes("VercelClient.fromConnection"), `${key} should not carry a team scope`);
    } else {
      assert(src.includes("VercelClient.fromConnection"), `${key} drops the connection's team`);
    }
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
