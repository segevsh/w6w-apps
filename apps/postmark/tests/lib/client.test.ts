import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, postmarkFetch, postmarkJsonInit } from "../../lib/client.ts";

Deno.test("postmarkFetch: GETs <API_URL><path> and returns the parsed JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ID: 1, Name: "My Server" } }]);
  const out = await postmarkFetch(ctx, "/server");
  assertEquals(out, { ID: 1, Name: "My Server" });
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "api.postmarkapp.com");
  assertEquals(url.pathname, "/server");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("postmarkFetch: sends a JSON POST body built by postmarkJsonInit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { MessageID: "abc" } }]);
  await postmarkFetch(ctx, "/email", postmarkJsonInit("POST", { From: "a@x.com" }));
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { From: "a@x.com" });
});

Deno.test("postmarkFetch: throws with ErrorCode + Message on a non-2xx response", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { ErrorCode: 300, Message: "Invalid email request" },
  }]);
  await assertRejects(
    () => postmarkFetch(ctx, "/email", postmarkJsonInit("POST", {})),
    Error,
    "Invalid email request",
  );
});

Deno.test("postmarkFetch: falls back to a bare status when the error body isn't JSON", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "Bad Gateway" }]);
  await assertRejects(
    () => postmarkFetch(ctx, "/server"),
    Error,
    "HTTP 502",
  );
});

Deno.test("postmarkFetch: returns undefined for an empty 200 body", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  const out = await postmarkFetch(ctx, "/bounces/1/activate", postmarkJsonInit("PUT", {}));
  assertEquals(out, undefined);
});

Deno.test("compact: drops undefined and empty-string values, keeps falsy-but-real ones", () => {
  assertEquals(
    compact({ a: "x", b: undefined, c: "", d: 0, e: false, f: null }),
    { a: "x", d: 0, e: false, f: null },
  );
});
