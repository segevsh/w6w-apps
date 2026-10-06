import { assertEquals, assertRejects } from "@std/assert";
import prospectUpdate from "../../actions/prospect-update.ts";
import { bodyOf, mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("prospect-update: PATCHes /prospects/{id} with the id echoed in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: single("prospect", 7, { title: "VP" }) }]);
  await prospectUpdate.execute({ id: 7, title: "VP", stageId: 2 }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/prospects/7");
  assertEquals(bodyOf(calls[0]), {
    data: {
      type: "prospect",
      id: 7,
      attributes: { title: "VP" },
      relationships: { stage: { data: { type: "stage", id: 2 } } },
    },
  });
});

Deno.test("prospect-update: every field is optional except the id, and it is idempotent", () => {
  const required = prospectUpdate.params!.filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["id"]);
  assertEquals(prospectUpdate.idempotent, true);
});

Deno.test("prospect-update: an invalid id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await prospectUpdate.execute({ id: -1 }, ctx),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
