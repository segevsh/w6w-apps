# Instagram for Business

Instagram Graph API for professional (Business and Creator) accounts, over
`graph.facebook.com` (v23.0): media, stories, comments, mentions, tags, hashtags, insights and
two-step content publishing. 26 actions, 89 unit tests.

Sibling of `facebook` (Pages); it shares the Graph conventions but not the surface.

## Auth

Facebook Login only — `oauth2` (scopes `instagram_basic`, `instagram_content_publish`,
`instagram_manage_comments`, `instagram_manage_insights`, `pages_show_list`,
`pages_read_engagement`) or a pasted `access-token`. The newer "Instagram Login" token is not
accepted by `graph.facebook.com` and lacks hashtag search, tags and mentions, so it is not offered.
The account must be linked to a Facebook Page; use List Instagram Accounts to find the
`igUserId`. The auth probe is `GET /me?fields=id` (returns only an id, never the credential) and is
classified from the body's `error`, not the status code.

## Actions

Accounts/media: list-instagram-accounts, get-account, list-media, get-media, list-media-children,
list-stories, list-tagged-media. Comments: list-comments, list-comment-replies, create-comment,
reply-to-comment, hide-comment, delete-comment, set-comments-enabled. Mentions: get-mentioned-media,
reply-to-mention. Publishing: create-media-container, create-carousel-container,
get-container-status, publish-container, get-publishing-limit. Hashtags: search-hashtag,
list-hashtag-recent-media, list-hashtag-top-media. Insights: get-account-insights,
get-media-insights.

Publishing is two steps: create a container (public URL, expires after 24h, 400 per 24h), poll
Get Container Status until `FINISHED`, then Publish Container.

## Health

- `service` — Meta's Graph API outage feed
  (`https://metastatus.com/outage-events-feed-graph-api.rss`, verified RSS with title "Graph API
  Status"). metastatus.com is an SPA that answers 200 with the same shell for any unknown path; only
  `/data/*` and the feed files are real. It has no Instagram API component, so Graph API is the
  covering surface. Any open entry is `degraded`.
- `quota` (informational) — reads `X-App-Usage` from a `/me?fields=id` probe.
  `unknown` when the header is absent.

## Findings

- Meta's docs disagree on the publishing ceiling (100 in the guide, `quota_total: 50` in the
  endpoint reference); Get Publishing Limit returns the live `config.quota_total`.
- Mentions have no list edge: the `media_id` comes from the webhook and is read via field
  expansion, `mentioned_media.media_id(ID){fields}`.
- Hashtag edges need Instagram Public Content Access, cap at 50 per page, and page on `after`
  only; 30 unique hashtags per 7 days.

## Omitted

Resumable (binary) video upload (`rupload.facebook.com`), delete media (docs conflict on
POST vs DELETE), messaging, webhook subscription management, live media, business discovery,
Instagram Login.

## Icon

`assets/icon.svg` is the simple-icons Instagram mark; `assets/icon.dark.svg` is a white variant.
