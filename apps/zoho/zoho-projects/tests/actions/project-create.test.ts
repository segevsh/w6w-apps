import { assertEquals } from "@std/assert";
import projectCreate from "../../actions/project-create.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("project-create: POST /api/v3/portal/1/projects", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "10" } }]);
  const res = await projectCreate.execute(
    {
      "portalId": "1",
      "name": "Site",
      "ownerZpuid": "7",
      "isPublicProject": false,
      "statusId": "5",
      "layoutId": "6",
      "copyFrom": "9",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/projects");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "Site",
    "owner": { "zpuid": "7" },
    "is_public_project": false,
    "status": { "id": "5" },
    "layout": { "id": "6" },
    "copy_from": "9",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(res.item, { "id": "10" });
});
