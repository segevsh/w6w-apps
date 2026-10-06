import { assertEquals, assertRejects } from "@std/assert";
import sequenceStateFinish from "../../actions/sequence-state-finish.ts";
import { errorsBody, mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("sequence-state-finish: POST /sequenceStates/{id}/actions/finish with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: single("sequenceState", 3, { state: "x" }) }]);
  const out = await sequenceStateFinish.execute({ id: 3 }, ctx) as { data: { id: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/sequenceStates/3/actions/finish");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].url.includes("actionParams"), false);
  assertEquals(out.data.id, 3);
});

Deno.test("sequence-state-finish: a 422 is reported", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorsBody("validationError", "Validation Error", "Not in a valid state."),
  }]);
  await assertRejects(
    async () => await sequenceStateFinish.execute({ id: 3 }, ctx),
    Error,
    "Not in a valid state.",
  );
});
