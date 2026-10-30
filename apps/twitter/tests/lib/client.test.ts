import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { base64ToBytes, dataUrlMime, TwitterClient } from "../../lib/client.ts";

test("base64ToBytes: decodes a bare base64 string", () => {
  const bytes = base64ToBytes("aGk="); // "hi"
  assertEquals(new TextDecoder().decode(bytes), "hi");
});

test("base64ToBytes: decodes a data: URL, ignoring the mime prefix", () => {
  const bytes = base64ToBytes("data:text/plain;base64,aGk=");
  assertEquals(new TextDecoder().decode(bytes), "hi");
});

test("dataUrlMime: extracts the mime type from a data: URL", () => {
  assertEquals(dataUrlMime("data:image/png;base64,AAAA"), "image/png");
  assertEquals(dataUrlMime("AAAA"), undefined);
});

test("TwitterClient: throws with the vendor's error detail on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { title: "Forbidden", detail: "not allowed" } }]);
  await assertRejects(
    () => new TwitterClient(ctx).request("/tweets/1"),
    Error,
    "not allowed",
  );
});

test("TwitterClient: falls back to the errors[].message list when detail is absent", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { errors: [{ message: "bad field" }] } }]);
  await assertRejects(
    () => new TwitterClient(ctx).request("/tweets", { method: "POST", body: {} }),
    Error,
    "bad field",
  );
});
