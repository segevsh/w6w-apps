import { assertEquals, assertRejects } from "@std/assert";
import sequenceStateResume from "../../actions/sequence-state-resume.ts";
import { errorsBody, mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("sequence-state-resume: POST /sequenceStates/{id}/actions/resume with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: single("sequenceState", 3, { state: "x" }) }]);
  const out = await sequenceStateResume.execute({ id: 3 }, ctx) as { data: { id: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/sequenceStates/3/actions/resume");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].url.includes("actionParams"), false);
  assertEquals(out.data.id, 3);
});

Deno.test("sequence-state-resume: a 422 is reported", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorsBody("validationError", "Validation Error", "Not in a valid state."),
  }]);
  await assertRejects(
    async () => await sequenceStateResume.execute({ id: 3 }, ctx),
    Error,
    "Not in a valid state.",
  );
});
