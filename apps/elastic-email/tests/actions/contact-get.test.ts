import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: GET /contacts/{email} percent-encodes the address", async () => {
  const { ctx, calls } = mockCtx([{ body: { Email: "a+b@x.com", Status: "Active" } }]);
  const out = await action.execute({ email: "a+b@x.com" }, ctx) as { Email: string };
  assertEquals(out.Email, "a+b@x.com");
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v4/contacts/a%2Bb%40x.com");
});

Deno.test("contact-get: requires an email and surfaces the vendor error", async () => {
  await assertRejects(async () => await action.execute({}, mockCtx().ctx), Error, "required");
  await assertRejects(
    async () =>
      await action.execute(
        { email: "x@y.z" },
        mockCtx([{ status: 404, body: errorBody("gone") }]).ctx,
      ),
    Error,
    "gone",
  );
});
