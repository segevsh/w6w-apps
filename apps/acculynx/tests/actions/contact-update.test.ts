import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-update.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("contact-update: sends PUT /contacts/c1 and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute(
    {
      contactId: "c1",
      lastName: "Lee",
      contactTypeIds: "t1,t2",
      companyName: "Acme Roofing",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/c1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    lastName: "Lee",
    companyName: "Acme Roofing",
    contactTypeIds: ["t1", "t2"],
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { success: true });
});

Deno.test("contact-update: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () =>
      await action.execute(
        {
          contactId: "c1",
          lastName: "Lee",
          contactTypeIds: "t1,t2",
          companyName: "Acme Roofing",
        } as never,
        ctx,
      ),
    Error,
    "AccuLynx 404",
  );
});

Deno.test("contact-update: refuses an update with no contact types, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ contactId: "c1", lastName: "Lee" } as never, ctx),
    Error,
    "contactTypeIds",
  );
  assertEquals(calls.length, 0);
});
