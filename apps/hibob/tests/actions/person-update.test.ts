import { assertEquals, assertRejects } from "@std/assert";
import personUpdate from "../../actions/person-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("person-update: PUTs the nested object as-is and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await personUpdate.execute(
    { employeeId: "7", fields: { work: { title: "Lead" }, firstName: "J" } },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/people/7");
  assertEquals(bodyOf(calls[0]), { work: { title: "Lead" }, firstName: "J" });
  assertEquals(out, { status: 200 });
});

Deno.test("person-update: accepts a JSON string and refuses an empty or non-object body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await personUpdate.execute({ employeeId: "7", fields: '{"firstName":"A"}' }, ctx);
  assertEquals(bodyOf(calls[0]), { firstName: "A" });
  await assertRejects(() =>
    Promise.resolve(personUpdate.execute({ employeeId: "7", fields: {} }, ctx))
  );
  await assertRejects(() =>
    Promise.resolve(personUpdate.execute({ employeeId: "7", fields: [1] }, ctx))
  );
});
