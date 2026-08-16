import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import { compactQuery, formatTldvError, TldvClient, truncate } from "../../lib/client.ts";

Deno.test("client: GET builds the full URL with the v1alpha1 prefix", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await new TldvClient(ctx).get("/meetings");
  assertEquals(calls[0].url, "https://pasta.tldv.io/v1alpha1/meetings");
  assertEquals(calls[0].method, "GET");
});

Deno.test("client: query values are compacted — undefined, null and empty string drop", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await new TldvClient(ctx).get("/meetings", {
    query: { query: undefined, page: 1, limit: null as unknown as number, meetingType: "" },
  });
  assertEquals(queryOf(calls[0].url), { page: "1" });
});

Deno.test("client: POST sends a JSON body with a content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, jobId: "j1", message: "ok" } }]);
  await new TldvClient(ctx).post("/meetings/import", { body: { name: "x", url: "https://y" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "x", url: "https://y" });
});

Deno.test("client: a non-ok response throws with the formatted message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { name: "NotFoundError", message: "Meeting not found" },
  }]);
  await assertRejects(
    () => new TldvClient(ctx).get("/meetings/does-not-exist"),
    Error,
    "NotFoundError",
  );
});

Deno.test("client: an unparseable body still throws, quoting the status", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>Bad Gateway</html>" }]);
  await assertRejects(() => new TldvClient(ctx).get("/meetings"), Error, "502");
});

Deno.test("formatTldvError: the flat validation shape — property + constraints", () => {
  const raw = JSON.stringify({
    message: "Invalid queries, check 'errors' property for more info.",
    errors: [{ property: "meetingType", constraints: { isEnum: "meetingType must be one of: " } }],
  });
  const msg = formatTldvError(400, "GET", "/v1alpha1/meetings", raw);
  assert(msg.includes("meetingType"));
  assert(msg.includes("must be one of"));
});

Deno.test("formatTldvError: the basic {name, message} shape", () => {
  const raw = JSON.stringify({
    name: "AuthorizationRequiredError",
    message: "Authorization is required for request on GET /v1alpha1/meetings",
  });
  const msg = formatTldvError(401, "GET", "/v1alpha1/meetings", raw);
  assert(msg.includes("AuthorizationRequiredError"));
  assert(msg.includes("Authorization is required"));
});

Deno.test("formatTldvError: non-JSON body degrades to the status line", () => {
  const msg = formatTldvError(502, "GET", "/v1alpha1/meetings", "<html>Bad Gateway</html>");
  assert(msg.includes("502"));
  assert(msg.includes("Bad Gateway"));
});

Deno.test("compactQuery: drops undefined, null and empty string; keeps false and 0", () => {
  assertEquals(
    compactQuery({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: "false", e: "0", f: "x" },
  );
});

Deno.test("truncate: leaves short text alone, cuts long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(900);
  const out = truncate(long, 800);
  assert(out.length < long.length);
  assert(out.includes("900 bytes truncated"));
});

Deno.test("client: pathOf/queryOf helpers split a recorded URL correctly", () => {
  assertEquals(pathOf("https://pasta.tldv.io/v1alpha1/meetings?limit=1"), "/v1alpha1/meetings");
  assertEquals(queryOf("https://pasta.tldv.io/v1alpha1/meetings?limit=1"), { limit: "1" });
});
