import { assertEquals } from "@std/assert";
import portalGet from "../../actions/portal-get.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("portal-get: GET /api/v3/portal/26828068", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "id": "26828068", "portal_name": "zylker" } }]);
  const res = await portalGet.execute({ "portalId": "26828068" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/26828068");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.item, { "id": "26828068", "portal_name": "zylker" });
});
