import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-files-get.ts";

Deno.test("template-files-get: same two JSON variants as the request equivalent", async () => {
  const url = mockCtx([{ status: 200, body: { file_url: "https://x" } }]);
  await action.execute!({ templateId: "t1" }, url.ctx);
  assertEquals(new URL(url.calls[0].url).pathname, "/v3/template/files_as_file_url/t1");

  const data = mockCtx([{ status: 200, body: { data_uri: "data:" } }]);
  await action.execute!({ templateId: "t1", format: "data_uri" }, data.ctx);
  assertEquals(new URL(data.calls[0].url).pathname, "/v3/template/files_as_data_uri/t1");
});

Deno.test("template-files-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`templateId`");
  assertEquals(calls.length, 0);
});
