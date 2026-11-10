import type { SlackTriggerSpec } from "./triggers.ts";

/**
 * The named Slack Events API triggers (https://docs.slack.dev/reference/events, verified
 * 2026-11-10). Each fires on exactly the event types listed, from the same signed delivery path as
 * the generic `event` trigger. The sample events follow the payload examples on each event's
 * reference page. Slack allows ONE Request URL per app, so a workflow that needs several of these
 * uses a Slack app per trigger, or the Slack Event trigger with an event filter.
 */
export interface NamedEvent {
  key: string;
  title: string;
  description: string;
  types: string[];
  subtypes?: string[];
  channelScoped?: boolean;
  sampleEvent: Record<string, unknown>;
}

export const NAMED_EVENTS: NamedEvent[] = [
  {
    key: "app-mention",
    title: "App Mentioned",
    description:
      "Fires when someone mentions the app's bot user in a channel. The run gets the channel, the user and the message text.",
    types: ["app_mention"],
    channelScoped: true,
    sampleEvent: {
      type: "app_mention",
      user: "U061F7AUR",
      text: "<@U0LAN0Z89> is it everything a river should be?",
      ts: "1515449522.000016",
      channel: "C123ABC456",
      event_ts: "1515449522000016",
    },
  },
  {
    key: "reaction-added",
    title: "Reaction Added",
    description:
      "Fires when a member adds an emoji reaction to a message or file. The run gets who reacted, the emoji and the item reacted to.",
    types: ["reaction_added"],
    channelScoped: true,
    sampleEvent: {
      type: "reaction_added",
      user: "U123ABC456",
      reaction: "thumbsup",
      item_user: "U222222222",
      item: { type: "message", channel: "C123ABC456", ts: "1360782400.498405" },
      event_ts: "1360782804.083113",
    },
  },
  {
    key: "reaction-removed",
    title: "Reaction Removed",
    description:
      "Fires when a member removes an emoji reaction. The run gets who removed it, the emoji and the item it was on.",
    types: ["reaction_removed"],
    channelScoped: true,
    sampleEvent: {
      type: "reaction_removed",
      user: "U123ABC456",
      reaction: "thumbsup",
      item_user: "U222222222",
      item: { type: "message", channel: "C123ABC456", ts: "1360782400.498405" },
      event_ts: "1360782804.083113",
    },
  },
  {
    key: "message-edited",
    title: "Message Edited",
    description:
      "Fires when a message is edited (the message event with the message_changed subtype). The run gets the channel and the raw event with the old and new message.",
    types: ["message"],
    subtypes: ["message_changed"],
    channelScoped: true,
    sampleEvent: {
      type: "message",
      subtype: "message_changed",
      channel: "C123ABC456",
      ts: "1358878755.000001",
      message: {
        type: "message",
        user: "U123ABC456",
        text: "Hello world, edited",
        ts: "1355517523.000005",
      },
      previous_message: {
        type: "message",
        user: "U123ABC456",
        text: "Hello world",
        ts: "1355517523.000005",
      },
    },
  },
  {
    key: "message-deleted",
    title: "Message Deleted",
    description:
      "Fires when a message is deleted (the message event with the message_deleted subtype). The run gets the channel and the raw event with the deleted message.",
    types: ["message"],
    subtypes: ["message_deleted"],
    channelScoped: true,
    sampleEvent: {
      type: "message",
      subtype: "message_deleted",
      channel: "C123ABC456",
      ts: "1358878755.000001",
      deleted_ts: "1358878749.000002",
      previous_message: {
        type: "message",
        user: "U123ABC456",
        text: "Hello world",
        ts: "1358878749.000002",
      },
    },
  },
  {
    key: "channel-created",
    title: "Channel Created",
    description:
      "Fires when a new channel is created in the workspace. The run gets the new channel's id (in channel) and the raw event with its name and creator.",
    types: ["channel_created"],
    sampleEvent: {
      type: "channel_created",
      channel: { id: "C024BE91L", name: "fun", created: 1360782804, creator: "U024BE7LH" },
    },
  },
  {
    key: "channel-renamed",
    title: "Channel Renamed",
    description:
      "Fires when a channel is renamed. The run gets the channel id and the raw event with the new name.",
    types: ["channel_rename", "group_rename"],
    sampleEvent: {
      type: "channel_rename",
      channel: { id: "C02ELGNBH", name: "new_name", created: 1360782804 },
    },
  },
  {
    key: "channel-archived",
    title: "Channel Archived",
    description:
      "Fires when a channel is archived. The run gets the channel id and the user who archived it.",
    types: ["channel_archive", "group_archive"],
    channelScoped: true,
    sampleEvent: { type: "channel_archive", channel: "C123ABC456", user: "U123ABC456" },
  },
  {
    key: "channel-unarchived",
    title: "Channel Unarchived",
    description:
      "Fires when a channel is unarchived. The run gets the channel id and the user who restored it.",
    types: ["channel_unarchive", "group_unarchive"],
    channelScoped: true,
    sampleEvent: { type: "channel_unarchive", channel: "C123ABC456", user: "U123ABC456" },
  },
  {
    key: "channel-deleted",
    title: "Channel Deleted",
    description: "Fires when a channel is deleted. The run gets the id of the deleted channel.",
    types: ["channel_deleted", "group_deleted"],
    channelScoped: true,
    sampleEvent: { type: "channel_deleted", channel: "C123ABC456" },
  },
  {
    key: "member-joined-channel",
    title: "Member Joined Channel",
    description:
      "Fires when a user joins a public or private channel. The run gets the channel, the user and who invited them.",
    types: ["member_joined_channel"],
    channelScoped: true,
    sampleEvent: {
      type: "member_joined_channel",
      user: "W123ABC456",
      channel: "C123ABC456",
      channel_type: "C",
      team: "T123ABC456",
      inviter: "U123456789",
    },
  },
  {
    key: "member-left-channel",
    title: "Member Left Channel",
    description:
      "Fires when a user leaves a public or private channel. The run gets the channel and the user.",
    types: ["member_left_channel"],
    channelScoped: true,
    sampleEvent: {
      type: "member_left_channel",
      user: "W123ABC456",
      channel: "C123ABC456",
      channel_type: "C",
      team: "T123ABC456",
    },
  },
  {
    key: "file-created",
    title: "File Created",
    description:
      "Fires when a user uploads a file. The run gets the file id; fetch the file with the Get File action.",
    types: ["file_created"],
    sampleEvent: { type: "file_created", file_id: "F2147483862", file: { id: "F2147483862" } },
  },
  {
    key: "file-shared",
    title: "File Shared",
    description:
      "Fires when a file is shared into a channel. The run gets the file id, the channel and the user who shared it.",
    types: ["file_shared"],
    channelScoped: true,
    sampleEvent: {
      type: "file_shared",
      channel_id: "D01315BHHSN",
      file_id: "F2147483862",
      user_id: "U0Z7K8SRH",
      file: { id: "F2147483862" },
      event_ts: "1617804931.000300",
    },
  },
  {
    key: "file-deleted",
    title: "File Deleted",
    description: "Fires when a file is deleted. The run gets the id of the deleted file.",
    types: ["file_deleted"],
    sampleEvent: { type: "file_deleted", file_id: "F2147483862", event_ts: "1361482916.000004" },
  },
  {
    key: "team-join",
    title: "New User Joined Workspace",
    description:
      "Fires when a new member joins the workspace. The run gets the new user's id (in user) and the raw event with the full user object.",
    types: ["team_join"],
    sampleEvent: {
      type: "team_join",
      user: {
        id: "W012A3CDE",
        team_id: "T123ABC456",
        name: "spengler",
        real_name: "Egon Spengler",
      },
    },
  },
  {
    key: "user-updated",
    title: "User Updated",
    description:
      "Fires when a member's account or profile changes (the user_change event). The run gets the user's id and the raw event with the updated user object.",
    types: ["user_change"],
    sampleEvent: {
      type: "user_change",
      user: {
        id: "W012A3CDE",
        team_id: "T123ABC456",
        name: "spengler",
        real_name: "Egon Spengler",
      },
    },
  },
  {
    key: "usergroup-created",
    title: "User Group Created",
    description:
      "Fires when a user group is added to the workspace. The run gets the raw event with the group.",
    types: ["subteam_created"],
    sampleEvent: {
      type: "subteam_created",
      subteam: {
        id: "S0615G0KT",
        name: "Marketing Team",
        handle: "marketing-team",
        user_count: "0",
      },
    },
  },
  {
    key: "usergroup-updated",
    title: "User Group Updated",
    description:
      "Fires when an existing user group is updated. The run gets the raw event with the group.",
    types: ["subteam_updated"],
    sampleEvent: {
      type: "subteam_updated",
      subteam: {
        id: "S516MPG9X",
        name: "My User Group Test",
        handle: "user-group-test",
        user_count: 7,
      },
    },
  },
  {
    key: "usergroup-members-changed",
    title: "User Group Members Changed",
    description:
      "Fires when the members of a user group change. The run gets the group id and the added and removed user ids in the raw event.",
    types: ["subteam_members_changed"],
    sampleEvent: {
      type: "subteam_members_changed",
      subteam_id: "S0614TZR7",
      team_id: "T060RNRCH",
      date_previous_update: 1446670362,
      date_update: 1492906952,
      added_users: ["U060R4BJ4"],
      added_users_count: 1,
      removed_users: ["U060RNRCZ"],
      removed_users_count: 1,
    },
  },
  {
    key: "star-added",
    title: "Star Added",
    description: "Fires when a member stars an item. The run gets who starred it and the item.",
    types: ["star_added"],
    sampleEvent: {
      type: "star_added",
      user: "U123ABC456",
      item: { type: "message", channel: "C123ABC456", message: { ts: "1360782400.498405" } },
      event_ts: "1360782804.083113",
    },
  },
  {
    key: "star-removed",
    title: "Star Removed",
    description:
      "Fires when a member removes a star from an item. The run gets who unstarred it and the item.",
    types: ["star_removed"],
    sampleEvent: {
      type: "star_removed",
      user: "U123ABC456",
      item: { type: "message", channel: "C123ABC456", message: { ts: "1360782400.498405" } },
      event_ts: "1360782804.083113",
    },
  },
];

export function namedSpec(key: string): SlackTriggerSpec {
  const e = NAMED_EVENTS.find((n) => n.key === key);
  if (!e) throw new Error(`No named Slack event ${key}.`);
  return {
    key: e.key,
    title: e.title,
    description: e.description,
    kind: "named",
    named: {
      types: e.types,
      subtypes: e.subtypes,
      channelScoped: e.channelScoped,
      sampleEvent: e.sampleEvent,
    },
  };
}
