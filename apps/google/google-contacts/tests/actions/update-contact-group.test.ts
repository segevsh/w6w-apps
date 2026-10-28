import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-contact-group.ts";

Deno.test("update-contact-group: PUTs the group, echoing resourceName into the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { resourceName: "contactGroups/1a", name: "Crew" } }]);
  const result = await action.execute({ resourceName: "contactGroups/1a", name: "Crew" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PUT");
  assertEquals(url.pathname, "/v1/contactGroups/1a");
  assertEquals([...url.searchParams.keys()], []);
  assertEquals(JSON.parse(calls[0].body!), {
    contactGroup: { resourceName: "contactGroups/1a", name: "Crew" },
    updateGroupFields: "name",
  });
  assertEquals(result, { resourceName: "contactGroups/1a", name: "Crew" });
});

Deno.test("update-contact-group: defaults updateGroupFields to `name`", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ resourceName: "1a", name: "Crew", updateGroupFields: [] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).updateGroupFields, "name");

  await action.execute({
    resourceName: "1a",
    name: "Crew",
    updateGroupFields: ["name", "clientData"],
  }, ctx);
  assertEquals(JSON.parse(calls[1].body!).updateGroupFields, "name,clientData");
});

Deno.test("update-contact-group: carries etag and clientData when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    resourceName: "1a",
    name: "Crew",
    etag: "%Eg1",
    clientData: [{ key: "k", value: "v" }],
    readGroupFields: ["name"],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    contactGroup: {
      resourceName: "contactGroups/1a",
      name: "Crew",
      etag: "%Eg1",
      clientData: [{ key: "k", value: "v" }],
    },
    updateGroupFields: "name",
    readGroupFields: "name",
  });
});

Deno.test("update-contact-group: omits an empty etag rather than sending a blank one", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ resourceName: "1a", name: "Crew", etag: "" }, ctx);
  assertEquals("etag" in JSON.parse(calls[0].body!).contactGroup, false);
});

Deno.test("update-contact-group: only `name` and `clientData` are offered as writable", () => {
  const options = (action.params?.find((p) => p.key === "updateGroupFields")
    ?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(options, ["clientData", "name"]);
  assertEquals(action.idempotent, true);
});

Deno.test("update-contact-group: rejects an empty resourceName before making a request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => action.execute({ resourceName: "", name: "Crew" }, ctx),
    Error,
    "resourceName is required",
  );
  assertEquals(calls.length, 0);
});
