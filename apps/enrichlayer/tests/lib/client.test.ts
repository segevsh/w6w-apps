import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { buildQuery, EnrichLayerClient, errorText, nextCursor } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

test("buildQuery: skips unset and empty values but keeps 0 and false", () => {
  assertEquals(
    buildQuery({ a: "x", b: undefined, c: null, d: "", e: 0, f: false }),
    "?a=x&e=0&f=false",
  );
  assertEquals(buildQuery(undefined), "");
  assertEquals(buildQuery({ a: undefined }), "");
});

test("nextCursor: reads the token from a next-page link, tolerating http and null", () => {
  assertEquals(
    nextCursor("https://enrichlayer.com/api/v2/search/person?next_token=t1&x=1", "next_token"),
    "t1",
  );
  assertEquals(
    nextCursor("http://enrichlayer.com/api/pc/company/job?pagination=a%3D%3D", "pagination"),
    "a==",
  );
  assertEquals(nextCursor("https://enrichlayer.com/x?y=1", "after"), null);
  assertEquals(nextCursor(null, "after"), null);
  assertEquals(nextCursor(undefined, "after"), null);
});

test("errorText: vendor envelope, then raw text", () => {
  assertEquals(
    errorText({ code: 429, description: "Slow down", name: "Too Many Requests" }),
    "Slow down (Too Many Requests)",
  );
  assertEquals(errorText({ description: "only" }), "only");
  assertEquals(errorText(null, "  gateway  "), "gateway");
});

test("client: sends GET with accept and no credential; non-JSON errors report raw text", async () => {
  const { ctx, calls } = mockCtx([{ status: 502, headers: {}, body: "bad gateway" }]);
  await assertRejects(
    async () => await new EnrichLayerClient(ctx).get("/profile", { profile_url: "u" }),
    Error,
    "HTTP 502 — bad gateway",
  );
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].url, "https://enrichlayer.com/api/v2/profile?profile_url=u");
});

test("client: an empty 200 body is an empty object", async () => {
  const { ctx } = mockCtx([{ body: undefined }]);
  assertEquals(await new EnrichLayerClient(ctx).get("/x"), {});
});
