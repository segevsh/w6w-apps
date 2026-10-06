import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/tag-create.ts";
import { mockCtx, pathOf, recordBody } from "../_helpers.ts";

Deno.test("tag-create: is a non-idempotent perform action requiring a name", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params!.filter((p) => p.required).map((p) => p.key), ["name"]);
});

Deno.test("tag-create: POSTs /tags with the name and optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: recordBody({ id: 3, name: "VIP" }) }]);
  const out = await action.execute({ name: "VIP", description: "Top buyers" }, ctx) as {
    record: { id: number };
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/tags");
  assertEquals(JSON.parse(calls[0].body!), { name: "VIP", description: "Top buyers" });
  assertEquals(out.record.id, 3);
});

Deno.test("tag-create: a 422 surfaces the errors array", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { errors: ["Name can't be blank"] } }]);
  await assertRejects(
    async () => await action.execute({ name: "" }, ctx),
    Error,
    "Name can't be blank",
  );
});
