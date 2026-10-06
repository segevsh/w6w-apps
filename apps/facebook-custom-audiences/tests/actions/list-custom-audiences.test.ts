import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-custom-audiences.ts";

Deno.test("list-custom-audiences: GET /act_<id>/customaudiences, always asks for fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ adAccountId: "555", pixelId: "9" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v25.0/act_555/customaudiences");
  assert(url.searchParams.get("fields")!.includes("operation_status"));
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("pixel_id"), "9");
});

Deno.test("list-custom-audiences: accepts the act_ prefix and rejects a bad id with no call", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ adAccountId: "act_555" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/act_555/customaudiences");
  await assertRejects(
    () => Promise.resolve(action.execute({ adAccountId: "5/../6" }, ctx)),
    Error,
    "Ad Account ID",
  );
  assertEquals(calls.length, 1);
});
