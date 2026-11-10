import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import profilePostsList from "../actions/profile-posts-list.ts";

interface Params {
  accountId: string;
  profileUrl: string;
}

const pollAction: ActionDefinition = {
  ...profilePostsList,
  execute(input, ctx) {
    return profilePostsList.execute({
      accountId: String(input.accountId),
      profileUrl: String(input.profileUrl),
      count: typeof input.count === "number" ? input.count : undefined,
      cursor: typeof input.cursor === "string" ? input.cursor : undefined,
      includeReshares: input.includeReshares === true,
    }, ctx);
  },
};

const trigger = pollFromListAction<Params>({
  key: "new-profile-post",
  title: "New Profile Post",
  description: "The run gets each post newly published by the selected profile.",
  action: pollAction,
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    { key: "profileUrl", label: "Profile URL", type: "string", required: true },
  ],
  input: ({ accountId, profileUrl }) => ({
    accountId,
    profileUrl,
    count: 10,
    includeReshares: false,
  }),
  items: (result) => {
    const data = (result as { data?: { posts?: unknown } }).data;
    return Array.isArray(data?.posts) ? data.posts : [];
  },
  idOf: (item) => {
    const post = item as { activity_id?: unknown; backend_urn?: unknown };
    return String(post.activity_id ?? post.backend_urn ?? "");
  },
  output: [
    { key: "activity_id", type: "string", label: "Post activity ID" },
    { key: "backend_urn", type: "string", label: "Post URN" },
    { key: "shareUrl", type: "string", label: "Post URL" },
    { key: "text", type: "string", label: "Post text" },
    { key: "published_at", type: "number", label: "Published at (Unix seconds)" },
    { key: "numLikes", type: "number", label: "Likes" },
    { key: "numComments", type: "number", label: "Comments" },
  ],
  sample: {
    activity_id: "7300000000000000001",
    backend_urn: "urn:li:activity:7300000000000000001",
    shareUrl: "/posts/sample-update",
    text: "A new update",
    published_at: 1773000000,
    numLikes: 3,
    numComments: 1,
  },
  minIntervalMs: 900_000,
  maxPages: 1,
});

export default trigger;
