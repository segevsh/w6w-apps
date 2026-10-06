import { assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/set-ice-breakers.ts";

const q = { question: "Hours?", payload: "HOURS" };

Deno.test("set-ice-breakers: sends the localized format with a default locale", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success" } }]);
  await action.execute!({ questions: [q] }, ctx);
  assertEquals(bodyOf(calls[0]), { ice_breakers: [{ locale: "default", call_to_actions: [q] }] });
});

Deno.test("set-ice-breakers: other locales follow the default", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success" } }]);
  const gb = { locale: "en_GB", call_to_actions: [q] };
  await action.execute!({ questions: [q], localized: [gb] }, ctx);
  assertEquals((bodyOf(calls[0]).ice_breakers as unknown[])[1], gb);
});

Deno.test("set-ice-breakers: 0 or 5 questions are rejected locally", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({ questions: [] }, ctx), Error, "1 to 4");
  await assertRejects(
    async () => await action.execute!({ questions: Array(5).fill(q) }, ctx),
    Error,
    "1 to 4",
  );
  await assertRejects(
    async () => await action.execute!({ questions: [q], localized: {} }, ctx),
    Error,
    "JSON array",
  );
  assertEquals(calls.length, 0);
});
