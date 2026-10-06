import { assertEquals } from "@std/assert";
import portalList from "../../actions/portal-list.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("portal-list: GET /api/v3/portals", async () => {
  const { ctx, calls } = mockProjectsCtx([{
    body: [{ "id": "26828068", "portal_name": "zylker" }],
  }]);
  const res = await portalList.execute({} as never, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portals");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.items, [{ "id": "26828068", "portal_name": "zylker" }]);
  assertEquals(res.hasNext, false);
  assertEquals(res.page, 1);
});
