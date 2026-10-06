import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-delete: DELETE /contacts/{email}; the empty 200 body becomes {deleted}", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await action.execute({ email: "a@x.com" }, ctx);
  assertEquals(out, { deleted: true, email: "a@x.com" });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v4/contacts/a%40x.com");
});

Deno.test("contact-delete: requires an email; vendor errors propagate", async () => {
  await assertRejects(async () => await action.execute({}, mockCtx().ctx), Error, "required");
  await assertRejects(
    async () =>
      await action.execute(
        { email: "a@x.com" },
        mockCtx([{ status: 400, body: errorBody("no") }]).ctx,
      ),
    Error,
    "no",
  );
});
