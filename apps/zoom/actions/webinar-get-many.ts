import type { ActionDefinition } from "@w6w/types";
import { unset, ZoomClient } from "../lib/client.ts";

interface Input {
  userId?: string;
  pageSize?: number;
  nextPageToken?: string;
}

const webinarGetMany: ActionDefinition<Input> = {
  key: "webinar-get-many",
  type: "search",
  resource: "webinar",
  title: "List Webinars",
  description: "List a user's webinars.",
  params: [
    { key: "userId", label: "User", type: "string", default: "me" },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 30,
      row: "page",
      validation: { min: 1, max: 300, integer: true },
    },
    { key: "nextPageToken", label: "Page token", type: "string", row: "page", advanced: true },
  ],
  output: [
    { key: "webinars", type: "array", label: "Webinars" },
    { key: "next_page_token", type: "string", label: "Token for the next page" },
  ],

  execute(input, ctx) {
    const user = input.userId || "me";
    return new ZoomClient(ctx).request(`/users/${encodeURIComponent(user)}/webinars`, {
      query: { page_size: input.pageSize, next_page_token: unset(input.nextPageToken) },
    });
  },
};

export default webinarGetMany;
