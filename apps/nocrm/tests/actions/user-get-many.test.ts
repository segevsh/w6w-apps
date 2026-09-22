import { assertEquals } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/user-get-many.ts";

Deno.test("user-get-many: sends every documented filter", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [{ id: 514 }] }]);
  await action.execute({
    email: "john.doe@mycompany.com",
    firstname: "John",
    lastname: "Doe",
    status: "activated",
    role: "admin",
    direction: "desc",
    teams: ["Sales", "517"],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/users");
  assertEquals(url.searchParams.get("email"), "john.doe@mycompany.com");
  assertEquals(url.searchParams.get("firstname"), "John");
  assertEquals(url.searchParams.get("lastname"), "Doe");
  assertEquals(url.searchParams.get("status"), "activated");
  assertEquals(url.searchParams.get("role"), "admin");
  assertEquals(url.searchParams.get("direction"), "desc");
  // "An array of the ids or names of the teams" — sent comma-separated.
  assertEquals(url.searchParams.get("teams"), "Sales,517");
});

Deno.test("user-get-many: sends no filters when the caller sets none", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [] }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/users");
});

Deno.test("user-get-many: reads X-TOTAL-COUNT beside the bare array", async () => {
  const { ctx } = mockNocrmCtx([{
    body: [{ id: 514 }],
    headers: { "content-type": "application/json", "x-total-count": "27" },
  }]);
  const page = await action.execute({}, ctx);
  assertEquals(page.totalCount, 27);
});
