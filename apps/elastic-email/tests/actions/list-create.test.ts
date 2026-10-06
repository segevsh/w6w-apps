import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-create: POST /lists with ListName, AllowUnsubscribe and Emails", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { ListName: "News", PublicListID: "p" } }]);
  const out = await action.execute({
    listName: "News",
    allowUnsubscribe: false,
    emails: "a@x.com,b@x.com",
  }, ctx) as { ListName: string };
  assertEquals(out.ListName, "News");
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v4/lists");
  assertEquals(JSON.parse(calls[0].body!), {
    ListName: "News",
    AllowUnsubscribe: false,
    Emails: ["a@x.com", "b@x.com"],
  });
});

Deno.test("list-create: name is required", async () => {
  await assertRejects(async () => await action.execute({}, mockCtx().ctx), Error, "required");
});
