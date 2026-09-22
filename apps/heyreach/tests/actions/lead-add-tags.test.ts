import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-add-tags.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/lead/AddTags";

Deno.test("lead-add-tags: tags go over as a JSON array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { newAssignedTags: ["customer"] } }]);
  const result = await action.execute!({
    leadProfileUrl: "https://www.linkedin.com/in/john-doe/",
    tags: ["customer", "q3"],
    createTagIfNotExisting: true,
  }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), {
    leadProfileUrl: "https://www.linkedin.com/in/john-doe/",
    tags: ["customer", "q3"],
    createTagIfNotExisting: true,
  });
  assertEquals(result, { newAssignedTags: ["customer"] });
});

/** `createTagIfNotExisting: false` is a real choice, not an absent field. */
Deno.test("lead-add-tags: an explicit false is still sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { newAssignedTags: [] } }]);
  await action.execute!(
    { leadLinkedInId: "abc", tags: "customer", createTagIfNotExisting: false },
    ctx,
  );
  assertEquals(jsonBody(calls[0]), {
    leadLinkedInId: "abc",
    tags: ["customer"],
    createTagIfNotExisting: false,
  });
});

Deno.test("lead-add-tags: a lead with no identifier sends neither field", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { newAssignedTags: [] } }]);
  await action.execute!({ tags: ["customer"], createTagIfNotExisting: true }, ctx);
  assertEquals(jsonBody(calls[0]), { tags: ["customer"], createTagIfNotExisting: true });
});
