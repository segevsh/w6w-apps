import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_HOST,
  apiVersionFromConnection,
  BASE_URL,
  errorMessage,
  TallyClient,
  VERSION_HEADER,
} from "../../lib/client.ts";

Deno.test("client: targets Tally's single documented host", () => {
  assertEquals(API_HOST, "api.tally.so");
  assertEquals(BASE_URL, "https://api.tally.so");
});

Deno.test("client: GETs the path and never sends an auth header", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const body = await new TallyClient(ctx).request("/forms");

  assertEquals(calls[0].url, "https://api.tally.so/forms");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(body, { ok: true });
});

Deno.test("client: omits undefined, null and empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new TallyClient(ctx).request("/forms", {
    query: { page: 2, limit: undefined, filter: null, afterId: "" },
  });
  assertEquals(new URL(calls[0].url).search, "?page=2");
});

Deno.test("client: repeats array query params rather than joining them", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new TallyClient(ctx).request("/forms", {
    query: { workspaceIds: ["w1", "w2"] },
  });
  assertEquals(new URL(calls[0].url).searchParams.getAll("workspaceIds"), ["w1", "w2"]);
});

Deno.test("client: sends a JSON body with a content-type on writes", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new TallyClient(ctx).request("/workspaces", { method: "POST", body: { name: "Ops" } });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"name":"Ops"}');
});

Deno.test("client: omits the tally-version header when the connection pinned none", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new TallyClient(ctx).request("/forms");
  assertEquals(calls[0].headers[VERSION_HEADER], undefined);
});

Deno.test("client: sends the tally-version header when the connection pinned one", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: { apiVersion: "2025-02-01" } });
  await new TallyClient(ctx).request("/forms");
  assertEquals(calls[0].headers[VERSION_HEADER], "2025-02-01");
});

Deno.test("client: a 204 with no body resolves to undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new TallyClient(ctx).request("/webhooks/w1", { method: "DELETE" }), undefined);
});

Deno.test("client: raises a labelled error carrying Tally's JSON message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "blocks is required" } }]);
  const error = await assertRejects(() =>
    new TallyClient(ctx).request("/forms", { method: "POST" })
  );
  assert(error instanceof Error);
  assert(error.message.includes("Tally 400"));
  assert(error.message.includes("/forms"));
  assert(error.message.includes("blocks is required"));
});

Deno.test("client: falls back to the raw text on a non-JSON error body", async () => {
  // Verified live: an unauthenticated GET /users/me answers text/plain "Unauthorized".
  const { ctx } = mockCtx([
    { status: 401, body: "Unauthorized", headers: { "content-type": "text/plain" } },
  ]);
  const error = await assertRejects(() => new TallyClient(ctx).request("/users/me"));
  assert(error instanceof Error);
  assert(error.message.includes("Unauthorized"));
});

Deno.test("apiVersionFromConnection: reads a pinned version, ignoring junk", () => {
  assertEquals(apiVersionFromConnection(undefined), undefined);
  assertEquals(
    apiVersionFromConnection({ display: {} } as never),
    undefined,
  );
  assertEquals(
    apiVersionFromConnection({ display: { apiVersion: "" } } as never),
    undefined,
  );
  assertEquals(
    apiVersionFromConnection({ display: { apiVersion: 5 } } as never),
    undefined,
  );
  assertEquals(
    apiVersionFromConnection({ display: { apiVersion: "2025-01-15" } } as never),
    "2025-01-15",
  );
});

Deno.test("errorMessage: prefers a known key, then raw text, then the status text", () => {
  assertEquals(errorMessage('{"message":"nope"}', {}), "nope");
  assertEquals(errorMessage('{"error":"invalid_client"}', {}), "invalid_client");
  assertEquals(errorMessage("plain failure", {}), "plain failure");
  assertEquals(errorMessage("", { statusText: "Bad Request" }), "Bad Request");
  assertEquals(errorMessage("", {}), "no response body");
});
