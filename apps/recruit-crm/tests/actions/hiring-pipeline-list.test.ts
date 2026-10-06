import { assertEquals } from "@std/assert";
import action from "../../actions/hiring-pipeline-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("hiring-pipeline-list: GETs /hiring-pipeline and returns the stages", async () => {
  const stages = [{ stage_id: 1, label: "Assigned" }, { stage_id: 2, label: "Interview" }];
  const { ctx, calls } = mockCtx([{ body: stages }]);
  assertEquals(await action.execute({}, ctx), { items: stages });
  assertEquals(pathOf(calls[0].url), "/v1/hiring-pipeline");
});

Deno.test("hiring-pipeline-list: wraps a lone object and an empty body", async () => {
  const one = mockCtx([{ body: { stage_id: 1, label: "Lead" } }]);
  assertEquals(await action.execute({}, one.ctx), { items: [{ stage_id: 1, label: "Lead" }] });
  const none = mockCtx([{ body: undefined }]);
  assertEquals(await action.execute({}, none.ctx), { items: [] });
});
