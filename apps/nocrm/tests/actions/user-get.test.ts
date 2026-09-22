import { assertEquals, assertRejects } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs a user by numeric id", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: { id: 639 } }]);
  assertEquals(await action.execute({ userId: "639" }, ctx), { id: 639 });
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/users/639");
});

Deno.test("user-get: percent-encodes an email address into one path segment", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: {} }]);
  await action.execute({ userId: "albert.einstein@genius.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.nocrm.io/api/v2/users/albert.einstein%40genius.com",
  );
});

Deno.test("user-get: a missing user surfaces record_not_found", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 404,
    body: { error: 404, message: "Record not found", type: "record_not_found" },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute({ userId: "nobody@example.com" }, ctx)),
    Error,
    "record_not_found",
  );
});
