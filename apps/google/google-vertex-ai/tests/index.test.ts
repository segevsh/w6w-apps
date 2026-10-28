import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { ALL_HOSTS, GLOBAL_HOST, hostFor, LOCATIONS, REGIONS } from "../lib/regions.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; categories: string[]; network: { allow: string[] } };
};

Deno.test("index: exports 14 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 14);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `bad key: ${a.key}`);
    assert(["read", "search", "perform", "control"].includes(a.type), `bad type: ${a.key}`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});

Deno.test("index: generation, prediction and job creation are not retry-safe", () => {
  const idem = (k: string) => app.actions.find((a) => a.key === k)!.idempotent;
  assertEquals(idem("generate-content"), false);
  assertEquals(idem("predict-endpoint"), false);
  assertEquals(idem("batch-prediction-job-create"), false);
  assertEquals(idem("batch-prediction-job-cancel"), true);
});

Deno.test("index: two auth methods and both health checks", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["oauth2", "service-account"]);
  assertEquals((app.healthChecks ?? []).map((c) => c.key).sort(), ["quota", "service"]);
});

/** The wildcard form `*-aiplatform.googleapis.com` is not valid, so the list is exact. */
Deno.test("index: network.allow is exactly the global host plus the fixed regional hosts", () => {
  assertEquals(manifest.w6w.id, "io.w6w.google-vertex-ai");
  assertEquals(manifest.w6w.network.allow, [...ALL_HOSTS]);
  assertEquals(manifest.w6w.network.allow.length, REGIONS.length + 1);
  assertEquals(manifest.w6w.network.allow[0], GLOBAL_HOST);
  for (const h of manifest.w6w.network.allow) {
    assert(!h.includes("*"), `wildcard host: ${h}`);
    assert(h === GLOBAL_HOST || /^[a-z]+-[a-z]+\d+-aiplatform\.googleapis\.com$/.test(h), h);
  }
  assert(!manifest.w6w.network.allow.includes("www.googleapis.com"));
  assert(!manifest.w6w.network.allow.includes("status.cloud.google.com"));
});

Deno.test("regions: hostFor maps locations and refuses anything off the list", () => {
  assertEquals(hostFor("global"), "aiplatform.googleapis.com");
  assertEquals(hostFor("europe-west4"), "europe-west4-aiplatform.googleapis.com");
  assert(LOCATIONS.includes("us-central1") && LOCATIONS.includes("asia-southeast1"));
  for (const bad of ["evil.com/", "us-central1.evil.com#", "", "us", "us-central1-aiplatform"]) {
    let threw = false;
    try {
      hostFor(bad);
    } catch {
      threw = true;
    }
    assert(threw, `hostFor accepted ${JSON.stringify(bad)}`);
  }
});

Deno.test("index: every action's location select offers only listed locations", () => {
  for (const a of app.actions) {
    const loc = a.params?.find((p) => p.key === "location");
    if (!loc) continue;
    assertEquals((loc.options as Array<{ value: string }>).map((o) => o.value), [...LOCATIONS]);
  }
});

Deno.test("index: icon is the vendor SVG and the category is ai", async () => {
  assertEquals(manifest.w6w.categories[0], "ai");
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.startsWith("<svg"));
});
