import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-contact-groups.ts";

Deno.test("list-contact-groups: GETs /contactGroups with no mask by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactGroups: [], totalItems: 0 } }]);
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/contactGroups");
  // groupFields is OPTIONAL here — unlike the person masks, omitting it is fine.
  assertEquals(url.searchParams.has("groupFields"), false);
  assertEquals(result, { contactGroups: [], totalItems: 0 });
});

Deno.test("list-contact-groups: joins a groupFields array into one mask", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ groupFields: ["name", "memberCount"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("groupFields"), "name,memberCount");
});

Deno.test("list-contact-groups: forwards paging and sync params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ pageSize: 200, pageToken: "p", syncToken: "s" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("pageSize"), "200");
  assertEquals(url.searchParams.get("pageToken"), "p");
  assertEquals(url.searchParams.get("syncToken"), "s");
});

Deno.test("list-contact-groups: offers only the documented group fields", () => {
  const options = (action.params?.find((p) => p.key === "groupFields")
    ?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(options, ["clientData", "groupType", "memberCount", "metadata", "name"]);
});
