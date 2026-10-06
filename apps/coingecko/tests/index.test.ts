import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { url: string; alt?: string } };
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
    assert(action.type !== "perform", `${action.key}: the covered API is read-only`);
  }
});

Deno.test("index: exports both auth methods and both health checks", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["demo-api-key", "pro-api-key"]);
  assertEquals((app.healthChecks ?? []).map((c) => c.key).sort(), ["quota", "service"]);
  for (const c of app.healthChecks ?? []) assertEquals(c.severity, "informational");
});

Deno.test("index: manifest declares both hosts, valid categories", () => {
  assertEquals(manifest.w6w.id, "io.w6w.coingecko");
  assertEquals(manifest.w6w.network.allow, ["api.coingecko.com", "pro-api.coingecko.com"]);
  assertEquals(manifest.w6w.categories, ["finance", "analytics"]);
});

Deno.test("index: the icon is the vendor's own 96x96 favicon", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  assertEquals(bytes.byteLength, 1684);
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(manifest.w6w.appearance.icon.alt, "CoinGecko");
});
