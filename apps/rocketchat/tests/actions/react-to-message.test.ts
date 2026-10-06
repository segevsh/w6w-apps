import { assertEquals } from "@std/assert";
import a from "../../actions/react-to-message.ts";
import { BASE, run } from "../_helpers.ts";

Deno.test("react-to-message: always sends shouldReact explicitly (default true)", async () => {
  const { call, json } = await run(a, { messageId: "M", emoji: ":thumbsup:" });
  assertEquals(call.url, `${BASE}/chat.react`);
  assertEquals(json, { messageId: "M", emoji: ":thumbsup:", shouldReact: true });
});

Deno.test("react-to-message: shouldReact:false removes the reaction", async () => {
  const { json } = await run(a, { messageId: "M", emoji: ":x:", shouldReact: false });
  assertEquals((json as { shouldReact: boolean }).shouldReact, false);
});
