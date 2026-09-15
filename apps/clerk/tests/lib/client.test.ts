import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ClerkClient, compact, csv, describeError, json } from "../../lib/client.ts";

Deno.test("compact: drops undefined/null/empty-string/empty-array, keeps false and 0", () => {
  const out = compact({ a: undefined, b: null, c: "", d: [], e: false, f: 0, g: "x" });
  assertEquals(out, { e: false, f: 0, g: "x" });
});

Deno.test("csv: splits a comma-separated string and trims", () => {
  assertEquals(csv("a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});

Deno.test("json: parses a JSON string, passes through a live value, and rejects bad JSON", () => {
  assertEquals(json('{"a":1}', "f"), { a: 1 });
  assertEquals(json({ a: 1 }, "f"), { a: 1 });
  assertEquals(json("", "f"), undefined);
  let threw = false;
  try {
    json("{not json", "f");
  } catch (e) {
    threw = true;
    assert(String(e).includes("`f`"));
  }
  assert(threw);
});

Deno.test("describeError: names clerk_key_invalid specifically, ahead of the generic 401 message", () => {
  const text = JSON.stringify({
    errors: [{
      message: "bad",
      long_message: "The provided Clerk Secret Key is invalid.",
      code: "clerk_key_invalid",
    }],
  });
  const msg = describeError(401, text);
  assert(msg.includes("not one Clerk recognises"), msg);
});

Deno.test("describeError: a malformed-header 401 gets the generic reconnect message", () => {
  const text = JSON.stringify({
    errors: [{
      message: "bad",
      long_message: "Invalid Authorization header format",
      code: "authorization_header_format_invalid",
    }],
  });
  const msg = describeError(401, text);
  assert(msg.includes("reconnect"), msg);
});

Deno.test("ClerkClient.request: builds the URL under /v1 and repeats array query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: true } }]);
  await new ClerkClient(ctx).request("/users", {
    query: { email_address: ["a@x.com", "b@x.com"] },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/users");
  assertEquals(url.searchParams.getAll("email_address"), ["a@x.com", "b@x.com"]);
});

Deno.test("ClerkClient.request: a non-2xx throws with Clerk's own message inlined", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      errors: [{
        message: "bad",
        long_message: "email_address is already in use",
        code: "form_identifier_exists",
      }],
    },
  }]);
  await assertRejects(
    async () => await new ClerkClient(ctx).request("/users", { method: "POST", body: {} }),
    Error,
    "already in use",
  );
});

Deno.test("ClerkClient.requestArray: a bare array response round-trips", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ id: "1" }, { id: "2" }] }]);
  const out = await new ClerkClient(ctx).requestArray("/users");
  assertEquals(out.length, 2);
});

Deno.test("ClerkClient.requestEnvelope: a `{ data, total_count }` response round-trips", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [{ id: "org_1" }], total_count: 1 } }]);
  const out = await new ClerkClient(ctx).requestEnvelope("/organizations");
  assertEquals(out.data.length, 1);
  assertEquals(out.total_count, 1);
});

Deno.test("ClerkClient.request: a 204/empty body resolves to undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new ClerkClient(ctx).request("/whatever");
  assertEquals(out, undefined);
});
