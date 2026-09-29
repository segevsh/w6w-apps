import { assert, assertEquals, assertRejects } from "@std/assert";
import { API_BASE, formatOtterError, OtterClient } from "../../lib/client.ts";
import { mockCtx, NOT_FOUND_404, UNAUTHORIZED_401 } from "../_helpers.ts";

Deno.test("client: the base is Otter's single declared host and version", () => {
  assertEquals(API_BASE, "https://api.otter.ai/v1");
});

Deno.test("client: get() parses a JSON body and sends no body of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const out = await new OtterClient(ctx).get("/channels");

  assertEquals(out, { data: [] });
  assertEquals(calls[0].url, "https://api.otter.ai/v1/channels");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
});

Deno.test("client: get() drops query values that are empty or undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new OtterClient(ctx).get("/conversations", {
    channel_id: "",
    cursor: undefined,
    limit: 20,
    include_shared: false,
  });

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("channel_id"), false);
  assertEquals(url.searchParams.has("cursor"), false);
  assertEquals(url.searchParams.get("limit"), "20");
  // `false` is a meaningful, documented value and must survive.
  assertEquals(url.searchParams.get("include_shared"), "false");
});

Deno.test("client: post() sends a JSON body with the content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await new OtterClient(ctx).post("/conversations", { file: "https://example.com/a.mp3" });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { file: "https://example.com/a.mp3" });
});

Deno.test("client: a non-2xx response throws, carrying the vendor's error code", async () => {
  const { ctx } = mockCtx([UNAUTHORIZED_401]);
  await assertRejects(
    () => new OtterClient(ctx).get("/workspace"),
    Error,
    "unauthorized",
  );
});

Deno.test("client: never sets Authorization itself — that is sign's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new OtterClient(ctx).get("/workspace");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("formatOtterError: surfaces the vendor's one documented error field", () => {
  const msg = formatOtterError(
    401,
    "GET",
    "/v1/workspace",
    JSON.stringify({ error: "unauthorized" }),
  );
  assertEquals(msg, "Otter 401 unauthorized for GET /v1/workspace");
});

Deno.test("formatOtterError: falls back to the raw body when it is not the documented shape", () => {
  const msg = formatOtterError(500, "GET", "/v1/workspace", "<html>gateway error</html>");
  assert(msg.includes("500"));
  assert(msg.includes("<html>gateway error</html>"));
});

Deno.test("client: an empty 200 body returns undefined rather than throwing a parse error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const out = await new OtterClient(ctx).get("/workspace");
  assertEquals(out, undefined);
});

Deno.test("client: the live-measured 404 error shape parses cleanly", async () => {
  const { ctx } = mockCtx([NOT_FOUND_404]);
  await assertRejects(
    () => new OtterClient(ctx).get("/conversations/does-not-exist"),
    Error,
    "not_found",
  );
});
