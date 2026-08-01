import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, StravaClient } from "../../lib/client.ts";

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: "x", f: false }), {
    a: 1,
    e: "x",
    f: false,
  });
});

Deno.test("StravaClient.request: builds the URL and query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await new StravaClient(ctx).request("/athlete", {
    query: { page: 2, unset: undefined },
  });
  assertEquals(out, { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v3/athlete");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.has("unset"), false);
});

Deno.test("StravaClient.request: JSON-encodes and compacts a body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new StravaClient(ctx).request("/activities", {
    method: "POST",
    body: { name: "Run", description: undefined },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Run" });
});

Deno.test("StravaClient.request: throws with vendor detail on a non-ok response", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { message: "Authorization Error", errors: [{ resource: "Athlete", field: "" }] },
  }]);
  await assertRejects(
    () => new StravaClient(ctx).request("/athlete"),
    Error,
    "Strava 401",
  );
});

Deno.test("StravaClient.request: returns undefined for a 204", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new StravaClient(ctx).request("/activities/1"), undefined);
});
