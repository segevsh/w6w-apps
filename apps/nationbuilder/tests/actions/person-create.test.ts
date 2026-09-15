import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/person-create.ts";

Deno.test("person-create: POSTs the JSON:API envelope to /signups", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: { id: "42", type: "signups", attributes: { first_name: "Kim" } } },
  }]);
  const out = await action.execute(
    { firstName: "Kim", lastName: "Possible", email: "k@e.com" },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/signups");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      type: "signups",
      attributes: { first_name: "Kim", last_name: "Possible", email: "k@e.com" },
    },
  });
  assertEquals(out, { id: "42", type: "signups", first_name: "Kim" });
});

Deno.test("person-create: merges custom_values and free-form attributes", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{ body: { data: {} } }]);
  await action.execute({
    firstName: "Kim",
    customValues: { volunteer_shirt_size: "L" },
    attributes: { church: "St. Mark's" },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.custom_values, { volunteer_shirt_size: "L" });
  assertEquals(body.data.attributes.church, "St. Mark's");
});

Deno.test("person-create: is not idempotent — NationBuilder does not dedupe on create", () => {
  assertEquals(action.idempotent, false);
});
