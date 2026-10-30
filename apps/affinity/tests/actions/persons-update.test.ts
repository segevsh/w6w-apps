import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import personsUpdate from "../../actions/persons-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("persons-update: PUTs only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 860197 } }]);
  await personsUpdate.execute({ personId: 860197, firstName: "Allison" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/persons/860197");
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Allison" });
});

test("persons-update: replaces emails (full list) when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 860197 } }]);
  await personsUpdate.execute(
    { personId: 860197, emails: "allison@affinity.co,allison@gmail.com" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).emails, ["allison@affinity.co", "allison@gmail.com"]);
});
