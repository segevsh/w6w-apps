import { assertEquals, assertRejects } from "@std/assert";
import scorecardGet from "../../actions/scorecard-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("scorecard-get: GET /v1/scorecards/{uuid}/", async () => {
  const body = { uuid: "s1", questions: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await scorecardGet.execute({ scorecardUuid: "s1" }, ctx), body);
  assertEquals(pathOf(calls[0].url), "/v1/scorecards/s1/");
});

Deno.test("scorecard-get: a blank uuid is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await scorecardGet.execute({ scorecardUuid: "" }, ctx),
    Error,
    "required",
  );
});
