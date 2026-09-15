import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

Deno.test("project-list: GETs /projects with filters", async () => {
  const { ctx, calls } = mockMocoCtx([{
    body: [{ id: 1, name: "Website Relaunch" }],
    headers: {
      "content-type": "application/json",
      "x-page": "1",
      "x-per-page": "100",
      "x-total": "1",
    },
  }]);
  const out = await action.execute({ companyId: "1233434", includeArchived: false }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/projects");
  assertEquals(url.searchParams.get("company_id"), "1233434");
  assertEquals(out, {
    projects: [{ id: 1, name: "Website Relaunch" }],
    page: 1,
    perPage: 100,
    total: 1,
  });
});
