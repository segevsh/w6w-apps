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
    count: 100,
    includeReshares: false,
  }),
  items: (result) => {
    const data = (result as { data?: unknown }).data;
    return Array.isArray(data) ? data : [];
  },
  idOf: (item) =>
    String((item as { id?: unknown; urn?: unknown }).id ?? (item as { urn?: unknown }).urn),
  output: [
    { key: "id", type: "string", label: "Post ID" },
    { key: "text", type: "string", label: "Post text" },
  ],
  sample: { id: "post-1", text: "A new update" },
  maxPages: 1,
});

export default trigger;
