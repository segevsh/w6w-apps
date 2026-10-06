import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-create.ts";

Deno.test("project-create: POST /3/projects with a wrapped body", async () => {
  const reply = { "Project": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ status: 201, body: reply }]);
  const result = await action.execute!({
    "description": "description-v",
    "projectNumber": "projectNumber-v",
    "status": "NOTSTARTED",
    "startDate": "startDate-v",
    "endDate": "endDate-v",
    "projectLeader": "projectLeader-v",
    "contactPerson": "contactPerson-v",
    "comments": "comments-v",
    "additionalFields": { "Comments": "extra" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/3/projects");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    Project: {
      "Description": "description-v",
      "ProjectNumber": "projectNumber-v",
      "Status": "NOTSTARTED",
      "StartDate": "startDate-v",
      "EndDate": "endDate-v",
      "ProjectLeader": "projectLeader-v",
      "ContactPerson": "contactPerson-v",
      "Comments": "extra",
    },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, reply);

  // Optional params that were not set are left out of the payload entirely.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({ "description": "description-v" } as never, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), { Project: { "Description": "description-v" } });
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});

Deno.test("project-create: rejects an additionalFields that is not a JSON object", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!(
        { "description": "description-v", "additionalFields": "[1]" } as never,
        ctx,
      ),
    Error,
    "additionalFields must be a JSON object",
  );
  assertEquals(calls.length, 0);
});
