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

Deno.test("index: exports 24 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 24);
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
 * `email-send` and `email-send-batch` claim `idempotent: true` for a side
 * effect that cannot be undone. That claim rests entirely on the
 * `Idempotency-Key` header, so it is asserted rather than trusted.
 */
Deno.test("index: the two send actions back their idempotency claim with a key", async () => {
  for (const name of ["email-send", "email-send-batch"]) {
    const action = app.actions.find((a) => a.key === name)!;
    assertEquals(action.idempotent, true, name);
    const src = await Deno.readTextFile(new URL(`../actions/${name}.ts`, import.meta.url));
    assert(src.includes("idempotencyKey"), `${name} claims idempotency with no key`);
    assert(src.includes("invocation?.invocationId"), `${name} does not default the key`);
  }
});

Deno.test("index: broadcast-send is honestly NOT idempotent", () => {
  // It reaches a whole audience and has no idempotency key.
  assertEquals(app.actions.find((a) => a.key === "broadcast-send")!.idempotent, false);
});

Deno.test("index: exports the one auth method and both declared health checks", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["api-key"]);
  assertEquals((app.healthChecks ?? []).map((c) => c.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest allowlists exactly the one API host", () => {
  assertEquals(manifest.w6w.id, "io.w6w.resend");
  assertEquals(manifest.w6w.network.allow, ["api.resend.com"]);
  // status.resend.com is a catch-all HTML page, not a status API — nothing
  // probes it, so nothing allowlists it either.
  assert(!manifest.w6w.network.allow.some((h) => h.includes("status")));
  assertEquals(manifest.w6w.categories, ["email", "communication"]);
});

Deno.test("index: no action creates an API key, which would leak a live secret", () => {
  // Resend shows a key's secret exactly once, at creation. An action that did
  // that would write it into the step output and the run log.
  assert(!app.actions.some((a) => a.key === "api-key-create"));
  assertEquals(app.actions.find((a) => a.key === "api-key-list")!.type, "read");
});

Deno.test("index: the icon is the vendor's mark, with a dark variant", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Resend</title>"), "the mark no longer names Resend");
  assert(svg.includes("M14.679 0c4.648 0 7.413 2.765"), "the vendor's geometry changed");
  assert(svg.includes('fill="#000000"'), "the light mark is no longer Resend black");

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

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
