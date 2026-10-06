import { assertEquals, assertRejects } from "@std/assert";
import leadFind from "../../actions/lead-find.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-find: PUT /zapier/findLead/{id} with no body, is a read action", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5, email: "a@b.com" } }]);
  const out = await leadFind.execute({ leadIdOrEmail: "a@b.com" }, ctx);
  assertEquals(leadFind.type, "read");
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/zapier/findLead/a%40b.com");
  assertEquals(calls[0].body, null);
  assertEquals(out, { data: { id: 5, email: "a@b.com" } });
});

Deno.test("lead-find: a not-found envelope on HTTP 200 rejects", async () => {
  const { ctx } = mockCtx([{ body: errorBody("Lead not found") }]);
  await assertRejects(
    () => Promise.resolve(leadFind.execute({ leadIdOrEmail: "z" }, ctx)),
    Error,
    "Lead not found",
  );
});
