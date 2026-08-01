import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/merge.ts";

Deno.test("merge: posts primary/secondary keyed by their id types", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!(
    {
      primaryIdType: "id",
      primaryId: "cool.person@company.com",
      secondaryIdType: "email",
      secondaryId: "cperson@gmail.com",
    },
    ctx,
  );
  assertEquals(calls[0].url, "https://track.customer.io/api/v1/merge_customers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    primary: { id: "cool.person@company.com" },
    secondary: { email: "cperson@gmail.com" },
  });
  assertEquals(result, { success: true });
});

Deno.test("merge: falls back to id type for an unrecognized idType value", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    { primaryIdType: "bogus", primaryId: "p1", secondaryIdType: "bogus", secondaryId: "s1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    primary: { id: "p1" },
    secondary: { id: "s1" },
  });
});

Deno.test("merge: rejects a blank primaryId or secondaryId", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!(
        { primaryIdType: "id", primaryId: "", secondaryIdType: "id", secondaryId: "s1" },
        ctx,
      ),
    Error,
    "`primaryId` is required",
  );
  await assertRejects(
    async () =>
      await action.execute!(
        { primaryIdType: "id", primaryId: "p1", secondaryIdType: "id", secondaryId: "" },
        ctx,
      ),
    Error,
    "`secondaryId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("merge: uses the eu host when the connection's region is eu", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute!(
    { primaryIdType: "id", primaryId: "p1", secondaryIdType: "id", secondaryId: "s1" },
    ctx,
  );
  assertEquals(calls[0].url, "https://track-eu.customer.io/api/v1/merge_customers");
});
