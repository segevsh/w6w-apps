import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, GoogleMeetClient, TOKEN_URL } from "../../lib/client.ts";

Deno.test("client: prefixes API_URL and returns parsed JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/abc" } }]);
  const client = new GoogleMeetClient(ctx);
  const result = await client.request<{ name: string }>("/spaces/abc");
  assertEquals(result.name, "spaces/abc");
  assertEquals(new URL(calls[0].url).host, "meet.googleapis.com");
  assertEquals(new URL(calls[0].url).pathname, "/v2/spaces/abc");
  assertEquals(API_URL, "https://meet.googleapis.com/v2");
  assertEquals(TOKEN_URL, "https://oauth2.googleapis.com/token");
});

Deno.test("client: keeps slashes in a resource name and the custom-method colon", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new GoogleMeetClient(ctx);
  await client.request("/conferenceRecords/cr1/transcripts/t1/entries/e1");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v2/conferenceRecords/cr1/transcripts/t1/entries/e1",
  );
  await client.request("/spaces/abc:endActiveConference", { method: "POST" });
  assertEquals(new URL(calls[1].url).pathname, "/v2/spaces/abc:endActiveConference");
});

Deno.test("client: skips undefined/null/empty query params, keeps zeros and false", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  const client = new GoogleMeetClient(ctx);
  await client.request("/x", {
    query: {
      a: undefined,
      b: null,
      c: "",
      d: 0,
      e: false,
      f: "keep",
    },
  });
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("a"));
  assert(!params.has("b"));
  assert(!params.has("c"));
  assertEquals(params.get("d"), "0");
  assertEquals(params.get("e"), "false");
  assertEquals(params.get("f"), "keep");
});

Deno.test("client: JSON-encodes bodies and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/abc" } }]);
  const client = new GoogleMeetClient(ctx);
  await client.request("/spaces", { method: "POST", body: { config: { accessType: "OPEN" } } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, `{"config":{"accessType":"OPEN"}}`);
});

Deno.test("client: throws with status + detail on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 404, statusText: "Not Found", body: "not here" }]);
  const client = new GoogleMeetClient(ctx);
  await assertRejects(
    async () => await client.request("/missing"),
    Error,
    "404",
  );
});

Deno.test("client: returns undefined for 204 No Content", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const client = new GoogleMeetClient(ctx);
  const result = await client.request<void>("/x", { method: "DELETE" });
  assertEquals(result, undefined);
});
