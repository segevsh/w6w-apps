import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transcript-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("transcript-get: GETs the record by id with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", status: { code: "done" } } }]);
  const out = await action.execute!({ id: "x1" }, ctx);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/transcript/x1/");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "x1", status: { code: "done" } });
});

Deno.test("transcript-get: percent-encodes the id and reports a 404 by code", async () => {
  const { ctx, calls } = mockCtx([{
    status: 404,
    body: { detail: "Not found.", code: "not_found" },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "a/b" }, ctx),
    Error,
    "HTTP 404 — Not found. (not_found)",
  );
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/transcript/a%2Fb/");
});
