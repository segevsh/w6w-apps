import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-contact.ts";

Deno.test("create-contact: POSTs the Person body with the REQUIRED personFields query", async () => {
  const { ctx, calls } = mockCtx([{ body: { resourceName: "people/c9", etag: "%Eg" } }]);
  const person = { names: [{ givenName: "Ada", familyName: "Lovelace" }] };
  const result = await action.execute({ person }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v1/people:createContact");
  // personFields is required on this write method too — it selects the echo.
  assertEquals(url.searchParams.get("personFields"), "names,emailAddresses,phoneNumbers");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), person);
  assertEquals(result, { resourceName: "people/c9", etag: "%Eg" });
});

Deno.test("create-contact: the person body is sent verbatim, not wrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    person: { emailAddresses: [{ value: "ada@example.com" }] },
    personFields: ["emailAddresses"],
  }, ctx);
  assertEquals(calls[0].body, '{"emailAddresses":[{"value":"ada@example.com"}]}');
  assertEquals(new URL(calls[0].url).searchParams.get("personFields"), "emailAddresses");
});

Deno.test("create-contact: forwards sources as repeated params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ person: { names: [] }, sources: ["READ_SOURCE_TYPE_CONTACT"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.getAll("sources"), ["READ_SOURCE_TYPE_CONTACT"]);
});

Deno.test("create-contact: rejects a missing person before making a request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => action.execute({ person: undefined as never }, ctx),
    Error,
    "`person` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-contact: is declared non-idempotent — a retry duplicates the contact", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
