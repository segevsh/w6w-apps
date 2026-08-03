import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-contact-group.ts";

Deno.test("delete-contact-group: DELETEs the group and leaves the contacts alone by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await action.execute({ resourceName: "contactGroups/1a" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/v1/contactGroups/1a");
  // The destructive flag is absent unless explicitly turned on.
  assertEquals(url.searchParams.has("deleteContacts"), false);
  assertEquals(result, { resourceName: "contactGroups/1a", success: true });
});

Deno.test("delete-contact-group: an explicit false is still omitted, matching the server default", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  await action.execute({ resourceName: "1a", deleteContacts: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("deleteContacts"), false);
});

Deno.test("delete-contact-group: deleteContacts=true is sent when opted into", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await action.execute({ resourceName: "1a", deleteContacts: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("deleteContacts"), "true");
  assertEquals(result, { resourceName: "contactGroups/1a", success: true });
});

Deno.test("delete-contact-group: defaults the destructive flag to false in its param", () => {
  const p = action.params?.find((x) => x.key === "deleteContacts");
  assertEquals(p?.default, false);
  assertEquals(action.idempotent, true);
});
