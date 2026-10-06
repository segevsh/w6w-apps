import { assert, assertEquals, assertRejects } from "@std/assert";
import action, { validItem } from "../../actions/create-list.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

const listBody = {
  status: { code: 200 },
  type: "list",
  data: { id: 3, name: "L", status: "queued" },
};
const items = [
  { full_name: "Stephen Hakami", company: "Wiza" },
  { profile_url: "https://www.linkedin.com/in/x/" },
  { email: "stephen@wiza.co" },
];

Deno.test("validItem: accepts the three documented shapes only", () => {
  assert(validItem({ full_name: "A", domain: "a.co" }));
  assert(validItem({ profile_url: "u" }));
  assert(validItem({ email: "a@b.co" }));
  assert(!validItem({ full_name: "A" }));
  assert(!validItem({ company: "A" }));
  assert(!validItem(null));
});

Deno.test("create-list: posts the nested list envelope with defaulted email options", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody }]);
  const out = await exec(action, { name: "L", enrichmentLevel: "partial", items }, ctx);
  assertEquals(calls[0].url, "https://wiza.co/api/lists");
  assertEquals(bodyOf(calls[0]), {
    list: {
      name: "L",
      enrichment_level: "partial",
      email_options: { accept_work: true, accept_personal: true, accept_generic: true },
      items,
    },
  });
  assertEquals(out, listBody.data);
});

Deno.test("create-list: items may be a JSON string; callback and skip_duplicates are passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody }]);
  await exec(action, {
    name: "L",
    enrichmentLevel: "full",
    items: JSON.stringify(items),
    acceptGeneric: false,
    skipDuplicates: true,
    callbackUrl: "https://example.com/h",
  }, ctx);
  const list = bodyOf(calls[0]).list as Record<string, unknown>;
  assertEquals(list.items, items);
  assertEquals(list.skip_duplicates, true);
  assertEquals(list.callback_url, "https://example.com/h");
  assertEquals((list.email_options as Record<string, boolean>).accept_generic, false);
});

Deno.test("create-list: bad items, over 2500 items, and no accepted email type never reach the API", async () => {
  const none = mockCtx();
  await assertRejects(
    () => exec(action, { name: "L", enrichmentLevel: "partial", items: [] }, none.ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    () =>
      exec(
        action,
        { name: "L", enrichmentLevel: "partial", items: [{ full_name: "A" }] },
        none.ctx,
      ),
    Error,
    "items[0]",
  );
  const big = Array.from({ length: 2501 }, () => ({ email: "a@b.co" }));
  await assertRejects(
    () => exec(action, { name: "L", enrichmentLevel: "partial", items: big }, none.ctx),
    Error,
    "2500",
  );
  await assertRejects(
    () =>
      exec(action, {
        name: "L",
        enrichmentLevel: "partial",
        items,
        acceptWork: false,
        acceptPersonal: false,
      }, none.ctx),
    Error,
    "work or personal",
  );
  assertEquals(none.calls.length, 0);
});

Deno.test("create-list: a 503 maintenance pause fails with the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 503,
    body: { status: { code: 503, message: "try again shortly" } },
  }]);
  await assertRejects(
    () => exec(action, { name: "L", enrichmentLevel: "none", items }, ctx),
    Error,
    "try again shortly",
  );
});
