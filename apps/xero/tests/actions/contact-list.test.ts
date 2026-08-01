import { assertEquals } from "@std/assert";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: GETs /Contacts with page defaulted to 1", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { Contacts: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api.xro/2.0/Contacts");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("contact-list: forwards where/order/page/IncludeArchived/summaryOnly", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { Contacts: [] } }]);
  await action.execute({
    where: 'Status=="ACTIVE"',
    order: "Name ASC",
    page: 2,
    includeArchived: true,
    summaryOnly: true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("where"), 'Status=="ACTIVE"');
  assertEquals(url.searchParams.get("order"), "Name ASC");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("IncludeArchived"), "true");
  assertEquals(url.searchParams.get("summaryOnly"), "true");
});
