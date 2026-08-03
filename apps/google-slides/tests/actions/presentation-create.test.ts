import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/presentation-create.ts";

Deno.test("presentation-create: POSTs the title to /v1/presentations", async () => {
  const { ctx, calls } = mockCtx([{ body: { presentationId: "p1", title: "Q3 Review" } }]);
  await action.execute({ title: "Q3 Review" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.origin, "https://slides.googleapis.com");
  assertEquals(url.pathname, "/v1/presentations");
  assertEquals(JSON.parse(calls[0].body!), { title: "Q3 Review" });
});

Deno.test("presentation-create: passes a user-supplied presentationId through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ title: "Deck", presentationId: "my-own-id" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { title: "Deck", presentationId: "my-own-id" });
});

Deno.test("presentation-create: sends nothing Google would ignore", async () => {
  // `Other fields in the request, including any provided content, are ignored.`
  // The action must not pretend otherwise by shipping pageSize/locale/slides.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ title: "Deck" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["title"]);

  const paramKeys = (action.params ?? []).map((p) => p.key);
  assertEquals(paramKeys, ["title", "presentationId"]);
});

Deno.test("presentation-create: is declared non-idempotent", () => {
  assertEquals(action.idempotent, false);
  assertEquals(action.type, "perform");
});
