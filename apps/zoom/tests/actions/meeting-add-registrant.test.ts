import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/meeting-add-registrant.ts";

Deno.test("meeting-add-registrant: POSTs the registrant with snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: { registrant_id: "r1" } }]);
  await action.execute(
    { meetingId: "1", email: "jo@acme.test", firstName: "Jo", lastName: "Smith" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v2/meetings/1/registrants");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "jo@acme.test",
    first_name: "Jo",
    last_name: "Smith",
  });
});

Deno.test("meeting-add-registrant: occurrence ids go in the query, not the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { meetingId: "1", email: "a@b.c", firstName: "A", occurrenceIds: "o1,o2" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.get("occurrence_ids"), "o1,o2");
  assertEquals("occurrence_ids" in JSON.parse(calls[0].body!), false);
});

Deno.test("meeting-add-registrant: notes that registration must be enabled", () => {
  assert(action.description?.includes("registration enabled"));
});
