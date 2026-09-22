import { assertEquals } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/lead-update.ts";

Deno.test("lead-update: PUTs a partial body to the lead", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: { id: 8113 } }]);
  await action.execute({ leadId: "8113", title: "Syl Loretta Incr.", tags: "small" }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads/8113");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { title: "Syl Loretta Incr.", tags: ["small"] });
});

Deno.test("lead-update: maps assignment, step and created_at", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: {} }]);
  await action.execute({
    leadId: "8113",
    userId: "stef@example.com",
    step: "1189",
    createdAt: "2014-02-28T17:37:33.000Z",
    description: "new",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.user_id, "stef@example.com");
  assertEquals(body.step, "1189");
  assertEquals(body.created_at, "2014-02-28T17:37:33.000Z");
  assertEquals(body.description, "new");
});
