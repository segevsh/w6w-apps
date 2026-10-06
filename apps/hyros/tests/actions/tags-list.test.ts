import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import tagsList from "../../actions/tags-list.ts";

Deno.test("tags-list: GET /tags returns the bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: { request_id: "r", result: ["!a", "$b"] } }]);
  const out = await tagsList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/tags");
  assertEquals(out, { result: ["!a", "$b"] });
});

Deno.test("tags-list: a 400 'Api key not valid' throws", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "ERROR", message: ["Api key not valid"] },
  }]);
  await assertRejects(async () => await tagsList.execute({}, ctx), Error, "Api key not valid");
});
