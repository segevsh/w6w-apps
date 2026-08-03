import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/quote-approve.ts";

Deno.test("quote-approve: the argument is plain `id`, not `quoteId`", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: { quoteApprove: { quote: { id: "q1", quoteStatus: "approved" }, userErrors: [] } },
    },
  }]);
  await action.execute({ quoteId: "q1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("quoteApprove(id: $id)"));
  assertEquals(sent.variables, { id: "q1" });
});

Deno.test("quote-approve: does not convert the quote into a job", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { quoteApprove: { quote: { id: "q1" }, userErrors: [] } } },
  }]);
  await action.execute({ quoteId: "q1" }, ctx);
  assert(!JSON.parse(calls[0].body!).query.includes("jobCreate"));
});

Deno.test("quote-approve: an illegal transition throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        quoteApprove: {
          quote: null,
          userErrors: [{ message: "Quote cannot transition from archived" }],
        },
      },
    },
  }]);
  await assertRejects(
    async () => await action.execute({ quoteId: "q1" }, ctx),
    Error,
    "cannot transition",
  );
});
