import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-member.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("create-member: POSTs /members/ with only the required email", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { members: [{ id: "1" }] } }], { display });
  const result = await action.execute!({ email: "a@b.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/ghost/api/admin/members/");
  assertEquals(JSON.parse(calls[0].body!), { members: [{ email: "a@b.com" }] });
  assertEquals(result, { id: "1" });
});

Deno.test("create-member: forwards name/note/labels when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { members: [{ id: "2" }] } }], { display });
  await action.execute!(
    { email: "a@b.com", name: "Alice", note: "VIP", labels: ["vip", "beta"] },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    members: [{ email: "a@b.com", name: "Alice", note: "VIP", labels: ["vip", "beta"] }],
  });
});
