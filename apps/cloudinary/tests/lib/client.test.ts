import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  CloudinaryClient,
  compact,
  contextString,
  csv,
  form,
  hostForRegion,
  json,
} from "../../lib/client.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("client: builds the cloud-scoped base URL for the connection's region", () => {
  const { ctx } = mockCtx([], conn);
  assertEquals(new CloudinaryClient(ctx).base, "https://api.cloudinary.com/v1_1/acme");

  const eu = mockCtx([], { display: { cloudName: "acme", region: "eu" } });
  assertEquals(new CloudinaryClient(eu.ctx).base, "https://api-eu.cloudinary.com/v1_1/acme");
});

Deno.test("hostForRegion: unknown or missing regions fall back to the US host", () => {
  assertEquals(hostForRegion("ap"), "https://api-ap.cloudinary.com");
  assertEquals(hostForRegion("nowhere"), "https://api.cloudinary.com");
  assertEquals(hostForRegion(undefined), "https://api.cloudinary.com");
});

Deno.test("client: a connection with no cloud name fails with a fixable message", () => {
  const { ctx } = mockCtx([], { display: {} });
  assertThrows(() => new CloudinaryClient(ctx), Error, "cloud name");
});

/** An API error repeats itself in a header, which is the reliable half. */
Deno.test("client: an error prefers the X-Cld-Error header", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { message: "Invalid public_id" } },
    headers: { "content-type": "application/json", "x-cld-error": "Invalid public_id" },
  }], conn);
  const err = await assertRejects(async () => await new CloudinaryClient(ctx).request("/ping"));
  assert(String(err).includes("Invalid public_id"), String(err));
});

/** An unknown PATH answers an HTML page, not JSON. */
Deno.test("client: an HTML 404 is reported as a routing problem, not a parse error", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: "<!DOCTYPE html><html><title>Cloudinary - Page not found</title></html>",
    headers: { "content-type": "text/html" },
  }], conn);
  const err = await assertRejects(async () => await new CloudinaryClient(ctx).request("/nope"));
  assert(/not an API route/.test(String(err)), String(err));
});

Deno.test("client: paging follows next_cursor and collects the named array", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { resources: [{ public_id: "a" }], next_cursor: "cur2" } },
    { status: 200, body: { resources: [{ public_id: "b" }] } },
  ], conn);
  const all = await new CloudinaryClient(ctx).requestAll("/resources/image/upload", "resources");
  assertEquals(all, [{ public_id: "a" }, { public_id: "b" }]);
  assertEquals(new URL(calls[1].url).searchParams.get("next_cursor"), "cur2");
});

Deno.test("client: array query params go out as repeated key[] entries", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await new CloudinaryClient(ctx).request("/resources/image/upload", {
    query: { public_ids: ["a", "b"] },
  });
  assertEquals(new URL(calls[0].url).searchParams.getAll("public_ids[]"), ["a", "b"]);
});

/** Cloudinary's context is a pipe-joined key=value string, NOT JSON. */
Deno.test("contextString: converts an object to Cloudinary's pipe form", () => {
  assertEquals(contextString('{"alt":"Hero","caption":"Hi"}', "context"), "alt=Hero|caption=Hi");
  assertEquals(contextString("alt=Hero", "context"), "alt=Hero");
  assertEquals(contextString("", "context"), undefined);
});

Deno.test("contextString: rejects values containing the separator", () => {
  assertThrows(() => contextString('{"alt":"a|b"}', "context"), Error, "separator");
  assertThrows(() => contextString('["not","an","object"]', "context"), Error, "key/value");
});

Deno.test("form: encodes arrays as key[] and objects as JSON", () => {
  const encoded = new URLSearchParams(form({
    file: "https://x.test/a.png",
    tags: ["a", "b"],
    nested: { x: 1 },
    skipped: "",
  }));
  assertEquals(encoded.get("file"), "https://x.test/a.png");
  assertEquals(encoded.getAll("tags[]"), ["a", "b"]);
  assertEquals(encoded.get("nested"), '{"x":1}');
  assertEquals(encoded.get("skipped"), null);
});

Deno.test("csv / compact / json behave as the actions assume", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(compact({ a: 1, b: "", c: null, d: [], e: "x" }), { a: 1, e: "x" });
  assertThrows(() => json("{oops", "context"), Error, "context");
});
