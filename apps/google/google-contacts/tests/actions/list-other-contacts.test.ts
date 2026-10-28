import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-other-contacts.ts";

Deno.test("list-other-contacts: GETs /otherContacts with the required readMask", async () => {
  const { ctx, calls } = mockCtx([{ body: { otherContacts: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/otherContacts");
  assertEquals(url.searchParams.get("readMask"), "names,emailAddresses,phoneNumbers");
});

Deno.test("list-other-contacts: offers only the five fields this resource exposes", () => {
  const readMask = action.params?.find((p) => p.key === "readMask");
  assertEquals(
    (readMask?.options as Array<{ value: string }>).map((o) => o.value),
    ["emailAddresses", "metadata", "names", "phoneNumbers", "photos"],
  );
  assertEquals(readMask?.required, true);
});

Deno.test("list-other-contacts: forwards paging and sync params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    readMask: ["names", "photos"],
    pageSize: 500,
    pageToken: "p1",
    requestSyncToken: true,
    syncToken: "s1",
    sources: ["READ_SOURCE_TYPE_CONTACT", "READ_SOURCE_TYPE_PROFILE"],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("readMask"), "names,photos");
  assertEquals(url.searchParams.get("pageSize"), "500");
  assertEquals(url.searchParams.get("pageToken"), "p1");
  assertEquals(url.searchParams.get("requestSyncToken"), "true");
  assertEquals(url.searchParams.get("syncToken"), "s1");
  assertEquals(url.searchParams.getAll("sources"), [
    "READ_SOURCE_TYPE_CONTACT",
    "READ_SOURCE_TYPE_PROFILE",
  ]);
});

Deno.test("list-other-contacts: an explicit false is sent; an unset boolean is omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ requestSyncToken: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("requestSyncToken"), "false");

  await action.execute({}, ctx);
  assertEquals(new URL(calls[1].url).searchParams.has("requestSyncToken"), false);
});
