import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    displayName: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { svg: string } };
  };
};

Deno.test("index: exports 27 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 27);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

Deno.test("index: the actions that duplicate on a retry are honest about it", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "file-upload-url",
    "message-send-to-chat",
    "message-send-to-jid",
    "message-send-to-phone",
    "note-add",
    "webhook-create",
  ]);
});

Deno.test("index: one bearer auth method, and it is the only place a credential is handled", () => {
  assertEquals(app.auth!.length, 1);
  assertEquals(app.auth![0].key, "api-token");
  assertEquals(app.auth![0].type, "bearer");
  assertEquals(typeof app.auth![0].sign, "function");
  assertEquals(typeof app.auth![0].test, "function");
});

Deno.test("index: health checks are service (declared absent), api and quota", () => {
  const checks = app.healthChecks!;
  assertEquals(checks.map((c) => c.key), ["service", "api", "quota"]);
  const service = checks.find((c) => c.key === "service")!;
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason, "a declared absence states its reason");
});

Deno.test("manifest: identity, one declared host, an svg icon", () => {
  assertEquals(manifest.w6w.id, "io.w6w.timelinesai");
  assertEquals(manifest.w6w.displayName, "TimelinesAI");
  assertEquals(manifest.w6w.network.allow, ["app.timelines.ai"]);
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("icon: is the vendor's verbatim svg wordmark", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.startsWith("<svg"));
  assert(svg.includes('viewBox="0 0 357 54"'));
});
