import type { Param } from "@w6w/types";
import { webhookTrigger } from "../lib/triggers.ts";

const LINK: Param = {
  key: "invitationLinkId",
  label: "Invitation link ID",
  type: "string",
  hint: "Only this invitation link (List Invitations has the ids). Leave empty for every link.",
};

const GROUPS: Param = {
  key: "groupIds",
  label: "Only links that add these groups",
  type: "string",
  hint: "Comma-separated group ids. Leave empty for any group.",
};

/** A visitor enters an email on an invitation link and never joins (action `ABANDONED_CART`). */
const abandonedInvitation = webhookTrigger({
  key: "abandoned-invitation",
  title: "Invitation Link Abandoned",
  description:
    "Fires when someone enters their email on an invitation link but neither pays nor joins; Heartbeat sends it 4 hours after the email was entered (action ABANDONED_CART). The run gets the email, the invitation link id and its group ids.",
  action: "ABANDONED_CART",
  params: [LINK, GROUPS],
  filter: (p) => {
    const f: Record<string, unknown> = {};
    if (typeof p.invitationLinkId === "string" && p.invitationLinkId.trim() !== "") {
      f.invitationLinkID = p.invitationLinkId.trim();
    }
    if (typeof p.groupIds === "string") {
      const ids = p.groupIds.split(",").map((g) => g.trim()).filter((g) => g !== "");
      if (ids.length > 0) f.groupIDs = ids;
    }
    return f;
  },
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "invitationLinkID", type: "string", label: "Invitation link ID" },
    { key: "groupIDs", type: "array", label: "Group IDs the link adds" },
  ],
  sample: {
    action: "ABANDONED_CART",
    email: "ada@example.com",
    invitationLinkID: "7c1d3e52-6d2a-4c58-8f0e-2a9b6f1d3c44",
    groupIDs: ["e6ccb009-ad46-4b09-a6e9-1412d9ff0601"],
  },
});

export default abandonedInvitation;
