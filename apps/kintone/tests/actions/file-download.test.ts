import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-download.ts";

const conn = { display: { baseUrl: "https://acme.cybozu.com" } };

test("file-download: GETs /k/v1/file.json?fileKey=... and base64-encodes the body", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, headers: { "content-type": "text/plain" }, body: "hello world" }],
    conn,
  );
  const out = await action.execute({ fileKey: "abc123" }, ctx);
  assertEquals(calls[0].url, "https://acme.cybozu.com/k/v1/file.json?fileKey=abc123");
  assertEquals(out.contentType, "text/plain");
  assertEquals(atob(out.content), "hello world");
});
