import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  csv,
  describeError,
  InstagramApiError,
  InstagramClient,
  jsonParam,
  seg,
} from "../../lib/client.ts";

Deno.test("client: throws InstagramApiError with code, subcode and path on non-2xx", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      statusText: "Bad Request",
      body: { error: { message: "boom", code: 100, error_subcode: 33 } },
    },
  ]);
  const err = await assertRejects(
    () => new InstagramClient(ctx).request("/1/media"),
    InstagramApiError,
  );
  assert(err.message.includes("boom") && err.message.includes("/v23.0/1/media"));
  assertEquals(err.code, 100);
  assertEquals(err.subcode, 33);
});

Deno.test("client: an error body on a 200 still throws", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { error: { message: "nope", code: 4 } } }]);
  await assertRejects(() => new InstagramClient(ctx).request("/x"), InstagramApiError, "nope");
});

Deno.test("client: non-JSON error body falls back to raw text", async () => {
  const { ctx } = mockCtx([{ status: 500, statusText: "ISE", body: "oops" }]);
  const err = await assertRejects(() => new InstagramClient(ctx).request("/x"), Error);
  assert(err.message.includes("oops"));
});

Deno.test("client: skips null/undefined/empty params, keeps false and 0", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new InstagramClient(ctx).request("/x", {
    params: { a: "k", b: undefined, c: null, d: "", e: false, f: 0 },
  });
  assertEquals(Object.fromEntries(new URL(calls[0].url).searchParams), {
    a: "k",
    e: "false",
    f: "0",
  });
});

Deno.test("client: never sets authorization", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new InstagramClient(ctx).request("/x");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("helpers: seg, csv, jsonParam, describeError", () => {
  assertEquals(seg("a/b"), "a%2Fb");
  assertEquals(csv(" a, b ,,"), "a,b");
  assertEquals(csv([]), undefined);
  assertEquals(jsonParam([1]), "[1]");
  assertEquals(jsonParam("[2]"), "[2]");
  assertEquals(jsonParam(""), undefined);
  assert(describeError({ error: { message: "m", code: 1, error_subcode: 2 } })?.includes("1/2"));
});
