import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import {
  API_BASE,
  AssemblyAiClient,
  baseForRegion,
  EU_API_BASE,
  formatAssemblyAiError,
  toArray,
  truncate,
} from "../../lib/client.ts";
import { errorBody, hostOf, mockCtx, pathOf } from "../_helpers.ts";

test("baseForRegion: 'eu' selects the EU host, everything else selects US", () => {
  assertEquals(baseForRegion("eu"), EU_API_BASE);
  assertEquals(baseForRegion("us"), API_BASE);
  assertEquals(baseForRegion(undefined), API_BASE);
  assertEquals(baseForRegion(""), API_BASE);
  assertEquals(baseForRegion("EU"), API_BASE); // case-sensitive, exactly "eu"
});

test("toArray: normalizes a comma string, an array, and empty input", () => {
  assertEquals(toArray("a,b, c"), ["a", "b", "c"]);
  assertEquals(toArray(["a", "b"]), ["a", "b"]);
  assertEquals(toArray(undefined), []);
  assertEquals(toArray(null), []);
  assertEquals(toArray(""), []);
});

test("truncate: leaves short text alone, truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(900);
  const out = truncate(long, 800);
  assertEquals(out.startsWith("x".repeat(800)), true);
  assertEquals(out.includes("900 bytes truncated"), true);
});

test("formatAssemblyAiError: surfaces the vendor's error message verbatim", () => {
  const msg = formatAssemblyAiError(
    400,
    "POST",
    "/v2/transcript",
    JSON.stringify(errorBody("Transcript creation error, audio_url not found")),
  );
  assertEquals(msg.includes("AssemblyAI 400 for POST /v2/transcript"), true);
  assertEquals(msg.includes("Transcript creation error, audio_url not found"), true);
});

test("formatAssemblyAiError: falls back to the raw body when it is not JSON (422 upload case)", () => {
  const msg = formatAssemblyAiError(422, "POST", "/v2/upload", "Upload failed, please try again");
  assertEquals(msg.includes("Upload failed, please try again"), true);
});

test("formatAssemblyAiError: annotates 429 with the rate-limit hint", () => {
  const msg = formatAssemblyAiError(
    429,
    "GET",
    "/v2/transcript",
    JSON.stringify(errorBody("Too Many Requests")),
  );
  assertEquals(msg.includes("rate limit exceeded"), true);
});

test("AssemblyAiClient.json: GETs the US host by default, no envelope to unwrap", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "t1", status: "queued" } }]);
  const out = await new AssemblyAiClient(ctx).json<{ id: string }>("/transcript/t1");
  assertEquals(hostOf(calls[0].url), "api.assemblyai.com");
  assertEquals(pathOf(calls[0].url), "/v2/transcript/t1");
  assertEquals(out.id, "t1");
});

test("AssemblyAiClient.json: region 'eu' routes to the EU host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "t1" } }]);
  await new AssemblyAiClient(ctx).json("/transcript/t1", { region: "eu" });
  assertEquals(hostOf(calls[0].url), "api.eu.assemblyai.com");
});

test("AssemblyAiClient.text: returns the raw text body (SRT/VTT), not JSON-parsed", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "WEBVTT\n\n00:00.000 --> 00:01.000\nHello" }]);
  const out = await new AssemblyAiClient(ctx).text("/transcript/t1/vtt");
  assertEquals(out.startsWith("WEBVTT"), true);
});

test("AssemblyAiClient: sends JSON body + content-type on POST", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "t1" } }]);
  await new AssemblyAiClient(ctx).json("/transcript", {
    method: "POST",
    body: { audio_url: "https://x/a.mp3" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!).audio_url, "https://x/a.mp3");
});

test("AssemblyAiClient: drops undefined/null/empty query values", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new AssemblyAiClient(ctx).json("/transcript", {
    query: { limit: 10, status: undefined, createdOn: null, afterId: "" },
  });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("limit"), "10");
  assertEquals(q.has("status"), false);
  assertEquals(q.has("createdOn"), false);
  assertEquals(q.has("afterId"), false);
});

test("AssemblyAiClient: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Authentication error, API token missing/invalid"),
  }]);
  await assertRejects(
    async () => await new AssemblyAiClient(ctx).json("/transcript"),
    Error,
    "Authentication error, API token missing/invalid",
  );
});
