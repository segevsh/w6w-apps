import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs JSON, mapping companySlug and stageId", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { first_name: "Bo", slug: "2" } }]);
  await action.execute({ firstName: "Bo", email: "bo@x.co", companySlug: "11", stageId: 3 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(JSON.parse(calls[0].body!), {
    first_name: "Bo",
    email: "bo@x.co",
    company_slug: "11",
    stage_id: 3,
  });
});

Deno.test("contact-create: refuses an empty form", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await (action.execute({}, ctx)), Error, "at least one");
  assertEquals(calls.length, 0);
});
