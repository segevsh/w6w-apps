import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import affiliateProspectCreate from "../../actions/affiliate-prospect-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("affiliate-prospect-create: posts required + optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "jimprosper" } }]);
  const out = await affiliateProspectCreate.execute(
    {
      firstname: "Jim",
      lastname: "Prosper",
      email: "jim@prosper.inc",
      programId: "johns-affiliate-program",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.6/affiliate-prospects/");
  assertEquals(JSON.parse(calls[0].body!), {
    firstname: "Jim",
    lastname: "Prosper",
    email: "jim@prosper.inc",
    program_id: "johns-affiliate-program",
  });
  assertEquals(out, { id: "jimprosper" });
});
