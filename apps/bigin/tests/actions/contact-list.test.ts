import { assertEquals } from "@std/assert";
import { mockBiginCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: GETs /bigin/v2/Contacts with the documented query parameters", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { data: [{ id: "1" }], info: { count: 1 } } }]);
  await action.execute(
    {
      fields: "id,Last_Name,First_Name,Email,Phone,Account_Name,Owner",
      page: 1,
      per_page: 200,
      sort_by: "Created_Time",
      sort_order: "desc",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/bigin/v2/Contacts");
  assertEquals(
    url.searchParams.get("fields"),
    "id,Last_Name,First_Name,Email,Phone,Account_Name,Owner",
  );
  assertEquals(url.searchParams.get("per_page"), "200");
  assertEquals(url.searchParams.get("sort_by"), "Created_Time");
  assertEquals(url.searchParams.get("sort_order"), "desc");
});

Deno.test("contact-list: posts the cursor parameters for paging past 2000 records", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { data: [] } }]);
  await action.execute({ fields: "id", page_token: "tok", cvid: "view-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page_token"), "tok");
  assertEquals(url.searchParams.get("cvid"), "view-1");
});
