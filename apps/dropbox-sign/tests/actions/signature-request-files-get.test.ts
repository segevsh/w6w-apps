import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/signature-request-files-get.ts";

Deno.test("files-get: defaults to the expiring URL variant", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { file_url: "https://x", expires_at: 1 } }]);
  await action.execute!({ signatureRequestId: "sr1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/signature_request/files_as_file_url/sr1");
});

Deno.test("files-get: the data URI variant is a different path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data_uri: "data:..." } }]);
  await action.execute!({ signatureRequestId: "sr1", format: "data_uri" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/signature_request/files_as_data_uri/sr1");
});

Deno.test("files-get: force_download is only sent when it is turned off", async () => {
  const on = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ signatureRequestId: "sr1" }, on.ctx);
  assertEquals(new URL(on.calls[0].url).searchParams.get("force_download"), null);

  const off = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ signatureRequestId: "sr1", forceDownload: false }, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.get("force_download"), "0");
});

/** The raw byte stream is deliberately not offered — an App returns JSON. */
Deno.test("files-get: only the two JSON variants are offered", () => {
  const format = (action.params as Array<{ key: string; options?: unknown }>)
    .find((p) => p.key === "format")!;
  assertEquals(
    (format.options as Array<{ value: string }>).map((o) => o.value),
    ["file_url", "data_uri"],
  );
});

Deno.test("files-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`signatureRequestId`");
  assertEquals(calls.length, 0);
});
