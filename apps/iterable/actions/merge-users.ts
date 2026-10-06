import type { ActionDefinition } from "@w6w/types";
import { call, compact, oneOf, str } from "../lib/client.ts";

/**
 * `POST /api/users/merge` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "merge-users",
  type: "perform",
  resource: "user",
  title: "Merge Users",
  description:
    "Merge a source user into a destination user, migrating profile data and events. Give exactly one source identifier and exactly one destination identifier.",
  idempotent: false,
  params: [
    { key: "sourceEmail", label: "Source Email", type: "string" },
    { key: "sourceUserId", label: "Source User ID", type: "string" },
    { key: "destinationEmail", label: "Destination Email", type: "string" },
    { key: "destinationUserId", label: "Destination User ID", type: "string" },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const sourceEmail = str(p.sourceEmail);
    const sourceUserId = str(p.sourceUserId);
    const destinationEmail = str(p.destinationEmail);
    const destinationUserId = str(p.destinationUserId);
    oneOf(["sourceEmail", "sourceUserId"], {
      "sourceEmail": sourceEmail,
      "sourceUserId": sourceUserId,
    }, "exactly-one");
    oneOf(["destinationEmail", "destinationUserId"], {
      "destinationEmail": destinationEmail,
      "destinationUserId": destinationUserId,
    }, "exactly-one");
    ctx.log("info", "Iterable Merge Users");
    const out = await call(ctx, "POST", "/users/merge", {
      body: compact({
        "sourceEmail": sourceEmail,
        "sourceUserId": sourceUserId,
        "destinationEmail": destinationEmail,
        "destinationUserId": destinationUserId,
      }),
    });
    return out;
  },
};

export default action;
