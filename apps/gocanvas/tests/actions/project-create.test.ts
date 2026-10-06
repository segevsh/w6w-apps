import { assertEquals } from "@std/assert";
import action from "../../actions/project-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-create: POST /api/v3/projects with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 12 } }]);
  const out = await action.execute(
    {
      "name": "Roof",
      "departmentId": 5,
      "customerId": 10,
      "siteId": 1,
      "startDate": "2024-01-30",
      "status": "draft",
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), {
    "name": "Roof",
    "department_id": 5,
    "customer_id": 10,
    "site_id": 1,
    "start_date": "2024-01-30",
    "status": "draft",
  });
  assertEquals(out, { "id": 12 });
});
