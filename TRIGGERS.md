# Trigger coverage

<!-- Generated from TRIGGERS.json. Do not edit by hand: run
     `deno task --cwd _tools triggers --write` -->

Generated from [TRIGGERS.json](TRIGGERS.json) (the source of truth) by
`deno task --cwd _tools triggers --write`; `--check` fails when this file is stale.
Rows with `verified: false` come from a code scan or model knowledge, not vendor docs.
Shipped status is derived from code (`triggers/*.ts`), never stored here.

**Totals:** 682 apps — webhook-api: 66, manual-webhook: 36, poll: 480, none: 100

## Depth

depth: 682 apps, 1793 triggers, 2563 unaccounted list actions in 536 apps, n8n-parity misses n/a (report-only)

| app | triggers | list actions | unaccounted |
|---|---|---|---|
| apps/streamtime | 0 | 24 | 24 |
| apps/eventbrite | 16 | 23 | 23 |
| apps/heartbeat | 8 | 16 | 16 |
| apps/gocanvas | 5 | 15 | 15 |
| apps/fortnox | 0 | 14 | 14 |
| apps/copper | 7 | 13 | 13 |
| apps/chatbase | 0 | 12 | 12 |
| apps/cloze | 3 | 12 | 12 |
| apps/freshworks/freshservice | 2 | 13 | 12 |
| apps/taskade | 0 | 12 | 12 |
| apps/affinity | 1 | 11 | 11 |
| apps/gumroad | 2 | 12 | 11 |
| apps/lokalise | 5 | 11 | 11 |
| apps/woodpecker | 0 | 11 | 11 |
| apps/mighty-networks | 3 | 10 | 10 |
| apps/tickettailor | 0 | 10 | 10 |
| apps/tidio | 0 | 10 | 10 |
| apps/unbounce | 1 | 11 | 10 |
| apps/wakatime | 1 | 11 | 10 |
| apps/2chat | 1 | 10 | 9 |
| apps/agencyzoom | 1 | 10 | 9 |
| apps/atlassian/confluence | 2 | 10 | 9 |
| apps/avoma | 1 | 10 | 9 |
| apps/bexio | 1 | 10 | 9 |
| apps/canny | 1 | 10 | 9 |
| apps/connecteam | 1 | 10 | 9 |
| apps/contentstack | 2 | 10 | 9 |
| apps/dixa | 1 | 10 | 9 |
| apps/gitea | 1 | 10 | 9 |
| apps/highlevel | 4 | 9 | 9 |
| apps/jibble | 1 | 10 | 9 |
| apps/lofty | 1 | 10 | 9 |
| apps/lusha | 1 | 9 | 9 |
| apps/maintainx | 2 | 10 | 9 |
| apps/manus | 1 | 10 | 9 |
| apps/mercury | 1 | 10 | 9 |
| apps/meta/instagram-for-business | 1 | 10 | 9 |
| apps/microsoft/microsoft-entra-id | 1 | 10 | 9 |
| apps/mixmax | 1 | 10 | 9 |
| apps/motion | 0 | 9 | 9 |
| apps/nocrm | 1 | 10 | 9 |
| apps/phrase | 2 | 10 | 9 |
| apps/printavo | 1 | 10 | 9 |
| apps/procore | 0 | 9 | 9 |
| apps/qualtrics | 0 | 9 | 9 |
| apps/recharge | 2 | 10 | 9 |
| apps/recruiterflow | 0 | 9 | 9 |
| apps/signrequest | 1 | 10 | 9 |
| apps/snyk | 2 | 10 | 9 |
| apps/tally | 1 | 10 | 9 |
| apps/tumblr | 1 | 10 | 9 |
| apps/uscreen | 3 | 11 | 9 |
| apps/vercel | 1 | 10 | 9 |
| apps/vimeo | 1 | 10 | 9 |
| apps/zoho/zoho-projects | 0 | 9 | 9 |
| apps/zoho/zohodesk | 1 | 10 | 9 |
| apps/aweber | 1 | 8 | 8 |
| apps/axonaut | 2 | 9 | 8 |
| apps/bamboohr | 1 | 9 | 8 |
| apps/baremetrics | 1 | 9 | 8 |
| apps/booqable | 1 | 9 | 8 |
| apps/braze | 1 | 9 | 8 |
| apps/close | 1 | 9 | 8 |
| apps/coingecko | 0 | 8 | 8 |
| apps/datadog | 1 | 9 | 8 |
| apps/deepgram | 1 | 9 | 8 |
| apps/digistore24 | 1 | 9 | 8 |
| apps/google/google-analytics | 0 | 8 | 8 |
| apps/hubstaff | 1 | 9 | 8 |
| apps/jobber | 2 | 9 | 8 |
| apps/jumpcloud | 1 | 9 | 8 |
| apps/kustomer | 2 | 9 | 8 |
| apps/manychat | 1 | 9 | 8 |
| apps/mem | 2 | 9 | 8 |
| apps/ninox | 1 | 9 | 8 |
| apps/onepagecrm | 1 | 9 | 8 |
| apps/outseta | 5 | 13 | 8 |
| apps/pennylane | 1 | 9 | 8 |
| apps/podio | 1 | 9 | 8 |
| apps/quo | 2 | 9 | 8 |
| apps/respondio | 0 | 8 | 8 |
| apps/sendblue | 1 | 9 | 8 |
| apps/sentry | 1 | 9 | 8 |
| apps/slite | 1 | 9 | 8 |
| apps/thanksio | 0 | 8 | 8 |
| apps/tidycal | 0 | 8 | 8 |
| apps/webex | 2 | 8 | 8 |
| apps/zoho/zoho-cliq | 1 | 9 | 8 |
| apps/addevent | 1 | 8 | 7 |
| apps/apify | 1 | 8 | 7 |
| apps/auth0 | 1 | 8 | 7 |
| apps/chatwork | 1 | 8 | 7 |
| apps/dialpad | 1 | 8 | 7 |
| apps/eztexting | 1 | 8 | 7 |
| apps/fivetran | 4 | 8 | 7 |
| apps/float | 2 | 8 | 7 |
| apps/freeagent | 2 | 8 | 7 |
| apps/google/google-ads | 0 | 7 | 7 |
| apps/google/looker | 0 | 7 | 7 |
| apps/heygen | 2 | 7 | 7 |
| apps/hostaway | 1 | 8 | 7 |
| apps/ironclad | 2 | 8 | 7 |
| apps/iterable | 1 | 8 | 7 |
| apps/klipfolio | 2 | 9 | 7 |
| apps/leexi | 1 | 8 | 7 |
| apps/littlegreenlight | 2 | 8 | 7 |
| apps/livechat | 1 | 8 | 7 |
| apps/lob | 1 | 8 | 7 |
| apps/loop-returns | 1 | 8 | 7 |
| apps/maileroo | 1 | 8 | 7 |
| apps/metabase | 0 | 7 | 7 |
| apps/microsoft/azuredevops | 3 | 8 | 7 |
| apps/mongodb-atlas | 1 | 8 | 7 |
| apps/newrelic | 0 | 7 | 7 |
| apps/raindrop | 2 | 9 | 7 |
| apps/redtail-crm | 1 | 8 | 7 |
| apps/replicate | 1 | 8 | 7 |
| apps/salesloft | 1 | 8 | 7 |
| apps/salesmsg | 1 | 8 | 7 |
| apps/salla | 2 | 8 | 7 |
| apps/sender | 2 | 8 | 7 |
| apps/sendpulse | 2 | 9 | 7 |
| apps/servicetitan | 2 | 8 | 7 |
| apps/simpletexting | 2 | 8 | 7 |
| apps/smartsheet | 2 | 8 | 7 |
| apps/solapi | 2 | 8 | 7 |
| apps/square | 1 | 8 | 7 |
| apps/streak | 2 | 8 | 7 |
| apps/synthflow | 1 | 8 | 7 |
| apps/teachable | 1 | 8 | 7 |
| apps/vbout | 1 | 8 | 7 |
| apps/videoask | 1 | 8 | 7 |
| apps/wix | 1 | 8 | 7 |
| apps/workos | 1 | 8 | 7 |
| apps/zoho/zoho-people | 1 | 8 | 7 |
| apps/zoho/zoho-workdrive | 1 | 8 | 7 |
| apps/acumbamail | 1 | 7 | 6 |
| apps/alegra | 1 | 7 | 6 |
| apps/atlassian/bitbucket | 7 | 6 | 6 |
| apps/atlassian/jira-service-management | 2 | 8 | 6 |
| apps/brex | 1 | 6 | 6 |
| apps/callrail | 1 | 8 | 6 |
| apps/capsulecrm | 2 | 7 | 6 |
| apps/chargebee | 1 | 7 | 6 |
| apps/clerk | 2 | 7 | 6 |
| apps/cleverreach | 1 | 7 | 6 |
| apps/clio | 2 | 7 | 6 |
| apps/clockodo | 0 | 6 | 6 |
| apps/cloudinary | 1 | 7 | 6 |
| apps/cursor | 1 | 7 | 6 |
| apps/deputy | 2 | 7 | 6 |
| apps/documerge | 1 | 7 | 6 |
| apps/enrichlayer | 0 | 6 | 6 |
| apps/feedly | 1 | 6 | 6 |
| apps/fireflies | 1 | 7 | 6 |
| apps/flodesk | 4 | 7 | 6 |
| apps/formbricks | 1 | 7 | 6 |
| apps/google/google-meet | 1 | 7 | 6 |
| apps/hex | 1 | 7 | 6 |
| apps/hyros | 2 | 8 | 6 |
| apps/invoiceninja | 2 | 7 | 6 |
| apps/launchdarkly | 2 | 8 | 6 |
| apps/lever | 2 | 7 | 6 |
| apps/loops | 1 | 7 | 6 |
| apps/mailerlite | 4 | 6 | 6 |
| apps/mautic | 4 | 6 | 6 |
| apps/meilisearch | 1 | 7 | 6 |
| apps/meta/facebook | 2 | 6 | 6 |
| apps/microsoft/microsoft-todo | 0 | 6 | 6 |
| apps/microsoft/powerbi | 2 | 7 | 6 |
| apps/miro | 1 | 7 | 6 |
| apps/nationbuilder | 2 | 7 | 6 |
| apps/odoo | 2 | 7 | 6 |
| apps/oncehub | 1 | 7 | 6 |
| apps/onepassword | 0 | 6 | 6 |
| apps/onfleet | 6 | 6 | 6 |
| apps/personio | 2 | 7 | 6 |
| apps/plivo | 2 | 8 | 6 |
| apps/printful | 0 | 6 | 6 |
| apps/processstreet | 1 | 7 | 6 |
| apps/quaderno | 1 | 7 | 6 |
| apps/quickbooks | 2 | 7 | 6 |
| apps/raisely | 2 | 7 | 6 |
| apps/recallai | 1 | 7 | 6 |
| apps/recruitee | 1 | 7 | 6 |
| apps/savvycal | 3 | 6 | 6 |
| apps/servicem8 | 2 | 7 | 6 |
| apps/splitwise | 2 | 7 | 6 |
| apps/storyblok | 1 | 7 | 6 |
| apps/thinkific | 2 | 7 | 6 |
| apps/thrivecart | 4 | 6 | 6 |
| apps/timelinesai | 1 | 7 | 6 |
| apps/wealthbox | 2 | 7 | 6 |
| apps/whatconverts | 1 | 7 | 6 |
| apps/whop | 1 | 7 | 6 |
| apps/workable | 1 | 7 | 6 |
| apps/acuityscheduling | 3 | 5 | 5 |
| apps/airbyte | 0 | 5 | 5 |
| apps/algolia | 1 | 6 | 5 |
| apps/base44 | 1 | 6 | 5 |
| apps/buffer | 1 | 6 | 5 |
| apps/clickhouse | 1 | 6 | 5 |
| apps/clicksend | 1 | 6 | 5 |
| apps/clientify | 4 | 7 | 5 |
| apps/cloudbeds | 2 | 6 | 5 |
| apps/digitalocean | 1 | 6 | 5 |
| apps/discourse | 1 | 6 | 5 |
| apps/docusign | 2 | 6 | 5 |
| apps/donorbox | 1 | 7 | 5 |
| apps/drip | 1 | 6 | 5 |
| apps/dropbox/dropbox-sign | 1 | 5 | 5 |
| apps/edenai | 0 | 5 | 5 |
| apps/formidableforms | 0 | 5 | 5 |
| apps/getresponse | 1 | 6 | 5 |
| apps/gocardless | 1 | 6 | 5 |
| apps/google/bigquery | 1 | 6 | 5 |
| apps/google/google-business-profile | 1 | 6 | 5 |
| apps/google/googlechat | 1 | 6 | 5 |
| apps/gorgias | 2 | 6 | 5 |
| apps/goto-webinar | 5 | 5 | 5 |
| apps/granola | 1 | 6 | 5 |
| apps/grist | 0 | 5 | 5 |
| apps/hackernews | 1 | 6 | 5 |
| apps/justcall | 1 | 6 | 5 |
| apps/kit | 1 | 6 | 5 |
| apps/klicktipp | 1 | 5 | 5 |
| apps/lodgify | 0 | 5 | 5 |
| apps/mailchimp/mandrill | 1 | 5 | 5 |
| apps/mailgun | 1 | 5 | 5 |
| apps/metricool | 0 | 5 | 5 |
| apps/microsoft/onedrive | 1 | 6 | 5 |
| apps/murf | 0 | 5 | 5 |
| apps/netlify | 3 | 5 | 5 |
| apps/nocodb | 1 | 6 | 5 |
| apps/ontraport | 4 | 8 | 5 |
| apps/paddle | 1 | 6 | 5 |
| apps/pinterest | 0 | 5 | 5 |
| apps/pipefy | 4 | 6 | 5 |
| apps/printnode | 1 | 6 | 5 |
| apps/recurly | 2 | 6 | 5 |
| apps/resend | 1 | 6 | 5 |
| apps/salesmate | 2 | 6 | 5 |
| apps/seatable | 1 | 6 | 5 |
| apps/sendfox | 1 | 6 | 5 |
| apps/shipstation | 2 | 6 | 5 |
| apps/simplybook | 1 | 6 | 5 |
| apps/splunk | 0 | 5 | 5 |
| apps/squarespace-commerce | 2 | 6 | 5 |
| apps/surveymonkey | 1 | 5 | 5 |
| apps/tableau | 2 | 6 | 5 |
| apps/talentlms | 0 | 5 | 5 |
| apps/teamwork | 1 | 6 | 5 |
| apps/textmagic | 1 | 6 | 5 |
| apps/todoist | 3 | 5 | 5 |
| apps/trustpilot | 1 | 6 | 5 |
| apps/vapi | 1 | 6 | 5 |
| apps/wave | 2 | 6 | 5 |
| apps/webflow | 4 | 5 | 5 |
| apps/webinargeek | 1 | 6 | 5 |
| apps/wise | 4 | 5 | 5 |
| apps/workiz | 0 | 5 | 5 |
| apps/wrike | 1 | 6 | 5 |
| apps/zendesk/zendesk-sell | 2 | 6 | 5 |
| apps/zoho/bigin | 2 | 6 | 5 |
| apps/zoho/zoho-campaigns | 1 | 6 | 5 |
| apps/activecampaign | 1 | 4 | 4 |
| apps/balena | 1 | 5 | 4 |
| apps/bitwarden | 1 | 5 | 4 |
| apps/blandai | 1 | 5 | 4 |
| apps/bluesky | 1 | 5 | 4 |
| apps/browseai | 1 | 5 | 4 |
| apps/certifier | 2 | 5 | 4 |
| apps/cloudconvert | 3 | 4 | 4 |
| apps/coda | 0 | 4 | 4 |
| apps/dub | 1 | 5 | 4 |
| apps/ecwid | 1 | 5 | 4 |
| apps/elevenlabs | 1 | 5 | 4 |
| apps/exa | 2 | 4 | 4 |
| apps/fathom | 1 | 5 | 4 |
| apps/fellow | 1 | 5 | 4 |
| apps/fireberry | 1 | 5 | 4 |
| apps/formsite | 1 | 5 | 4 |
| apps/formspark | 1 | 4 | 4 |
| apps/freshbooks | 1 | 5 | 4 |
| apps/freshworks/freshsales | 2 | 5 | 4 |
| apps/gamma | 1 | 5 | 4 |
| apps/gerrit | 1 | 5 | 4 |
| apps/ghost | 1 | 5 | 4 |
| apps/google/google-admin | 0 | 4 | 4 |
| apps/google/youtube | 1 | 5 | 4 |
| apps/grain | 1 | 5 | 4 |
| apps/guru | 1 | 5 | 4 |
| apps/harvest | 1 | 5 | 4 |
| apps/helpscout | 4 | 4 | 4 |
| apps/heyreach | 1 | 5 | 4 |
| apps/homeassistant | 1 | 4 | 4 |
| apps/honeybook | 1 | 5 | 4 |
| apps/jotform | 2 | 5 | 4 |
| apps/kudosity | 1 | 5 | 4 |
| apps/kvcore | 0 | 4 | 4 |
| apps/landbot | 1 | 5 | 4 |
| apps/lemlist | 2 | 6 | 4 |
| apps/linkedin/linkedin-ads | 1 | 5 | 4 |
| apps/luma | 1 | 5 | 4 |
| apps/mailjet | 1 | 5 | 4 |
| apps/microsoft/sharepoint | 1 | 5 | 4 |
| apps/moco | 1 | 5 | 4 |
| apps/monday | 2 | 4 | 4 |
| apps/opusclip | 0 | 4 | 4 |
| apps/pagerduty | 1 | 5 | 4 |
| apps/paperform | 2 | 6 | 4 |
| apps/parseur | 1 | 5 | 4 |
| apps/patreon | 2 | 4 | 4 |
| apps/pinecone | 2 | 6 | 4 |
| apps/posthog | 1 | 4 | 4 |
| apps/quickbase | 1 | 5 | 4 |
| apps/rdstation | 1 | 5 | 4 |
| apps/regfox | 2 | 5 | 4 |
| apps/replyio | 2 | 5 | 4 |
| apps/rocketchat | 2 | 5 | 4 |
| apps/rocketreach | 0 | 4 | 4 |
| apps/seven | 1 | 5 | 4 |
| apps/sharetribe | 1 | 5 | 4 |
| apps/skyvern | 1 | 5 | 4 |
| apps/smartsuite | 2 | 5 | 4 |
| apps/softr | 1 | 5 | 4 |
| apps/statuspage | 1 | 5 | 4 |
| apps/terraform | 4 | 4 | 4 |
| apps/ticktick | 1 | 5 | 4 |
| apps/toggl | 3 | 4 | 4 |
| apps/tremendous | 1 | 5 | 4 |
| apps/typefully | 1 | 5 | 4 |
| apps/typesense | 1 | 5 | 4 |
| apps/wistia | 1 | 5 | 4 |
| apps/wiza | 0 | 4 | 4 |
| apps/xero | 1 | 5 | 4 |
| apps/zoho/zoho | 2 | 5 | 4 |
| apps/zoho/zoho-inventory | 2 | 5 | 4 |
| apps/zoho/zoho-invoice | 2 | 5 | 4 |
| apps/zoho/zoho-recruit | 2 | 5 | 4 |
| apps/zoho/zohobooks | 2 | 5 | 4 |
| apps/zoho/zohomail | 1 | 5 | 4 |
| apps/zuora | 1 | 5 | 4 |
| apps/airtop | 0 | 3 | 3 |
| apps/amplitude | 1 | 4 | 3 |
| apps/atlassian/jira-data-center | 1 | 4 | 3 |
| apps/aws/ses | 3 | 6 | 3 |
| apps/basecamp | 1 | 4 | 3 |
| apps/brevo | 1 | 3 | 3 |
| apps/cal | 3 | 3 | 3 |
| apps/clockify | 6 | 3 | 3 |
| apps/constantcontact | 1 | 4 | 3 |
| apps/contentful | 1 | 4 | 3 |
| apps/crunchbase | 0 | 3 | 3 |
| apps/devin | 2 | 4 | 3 |
| apps/docuseal | 1 | 3 | 3 |
| apps/dust | 2 | 5 | 3 |
| apps/easypost | 1 | 4 | 3 |
| apps/emailoctopus | 3 | 5 | 3 |
| apps/firestore | 1 | 4 | 3 |
| apps/folk | 1 | 4 | 3 |
| apps/formstack-documents | 1 | 4 | 3 |
| apps/google/google-contacts | 1 | 4 | 3 |
| apps/google/google-vertex-ai | 0 | 3 | 3 |
| apps/google/googlesearchconsole | 0 | 3 | 3 |
| apps/groq | 0 | 3 | 3 |
| apps/holded | 0 | 3 | 3 |
| apps/htmlcsstoimage | 0 | 3 | 3 |
| apps/inoreader | 1 | 3 | 3 |
| apps/instantly | 1 | 4 | 3 |
| apps/jinaai | 0 | 3 | 3 |
| apps/jobnimbus | 2 | 4 | 3 |
| apps/jobtread | 1 | 4 | 3 |
| apps/judgeme | 2 | 3 | 3 |
| apps/lawmatics | 1 | 4 | 3 |
| apps/learnworlds | 1 | 4 | 3 |
| apps/marketo | 1 | 3 | 3 |
| apps/microsoft/excel | 2 | 4 | 3 |
| apps/microsoft/onenote | 1 | 4 | 3 |
| apps/mixpanel | 1 | 4 | 3 |
| apps/msg91 | 0 | 3 | 3 |
| apps/mux | 0 | 3 | 3 |
| apps/okta | 2 | 3 | 3 |
| apps/pandadoc | 2 | 4 | 3 |
| apps/peopledatalabs | 1 | 3 | 3 |
| apps/planningcenter | 2 | 4 | 3 |
| apps/postmark | 1 | 4 | 3 |
| apps/prospeo | 0 | 3 | 3 |
| apps/pushbullet | 2 | 4 | 3 |
| apps/readwise | 1 | 4 | 3 |
| apps/recruit-crm | 0 | 3 | 3 |
| apps/refiner | 1 | 4 | 3 |
| apps/retellai | 2 | 4 | 3 |
| apps/ringcentral | 2 | 5 | 3 |
| apps/short-io | 1 | 4 | 3 |
| apps/strava | 3 | 3 | 3 |
| apps/teamleader | 2 | 4 | 3 |
| apps/zoho/zoho-analytics | 1 | 4 | 3 |
| apps/zoho/zoho-bookings | 1 | 4 | 3 |
| apps/zoho/zoho-creator | 1 | 5 | 3 |
| apps/adyen | 4 | 2 | 2 |
| apps/anthropic | 1 | 3 | 2 |
| apps/baserow | 1 | 3 | 2 |
| apps/beehiiv | 1 | 3 | 2 |
| apps/beeminder | 1 | 3 | 2 |
| apps/bitrix24 | 1 | 3 | 2 |
| apps/bloomerang | 1 | 3 | 2 |
| apps/campaignmonitor | 1 | 2 | 2 |
| apps/canva | 1 | 3 | 2 |
| apps/circleci | 1 | 3 | 2 |
| apps/clearout | 3 | 2 | 2 |
| apps/crisp | 2 | 3 | 2 |
| apps/databricks | 0 | 2 | 2 |
| apps/demio | 0 | 2 | 2 |
| apps/diffbot | 1 | 2 | 2 |
| apps/docparser | 1 | 3 | 2 |
| apps/duda | 1 | 3 | 2 |
| apps/egnyte | 1 | 3 | 2 |
| apps/elastic-email | 7 | 2 | 2 |
| apps/encharge | 1 | 3 | 2 |
| apps/esignatures | 5 | 2 | 2 |
| apps/formstack | 2 | 3 | 2 |
| apps/freshworks/freshdesk | 2 | 3 | 2 |
| apps/fullenrich | 0 | 2 | 2 |
| apps/gcs | 0 | 2 | 2 |
| apps/giphy | 0 | 2 | 2 |
| apps/google/google-maps | 0 | 2 | 2 |
| apps/gotify | 1 | 3 | 2 |
| apps/grafana | 1 | 3 | 2 |
| apps/hedy | 0 | 2 | 2 |
| apps/hotmart | 1 | 3 | 2 |
| apps/hunter | 1 | 3 | 2 |
| apps/instapaper | 1 | 3 | 2 |
| apps/kommo | 1 | 3 | 2 |
| apps/matrix | 1 | 2 | 2 |
| apps/mattermost | 1 | 2 | 2 |
| apps/meta/facebook-custom-audiences | 0 | 2 | 2 |
| apps/meta/facebook-lead-ads | 1 | 2 | 2 |
| apps/meta/facebook-messenger | 1 | 2 | 2 |
| apps/microsoft/azure-blob | 2 | 2 | 2 |
| apps/mindee | 0 | 2 | 2 |
| apps/moneybird | 3 | 3 | 2 |
| apps/moonclerk | 1 | 3 | 2 |
| apps/nutshell | 1 | 3 | 2 |
| apps/otter | 1 | 3 | 2 |
| apps/particle | 1 | 3 | 2 |
| apps/paypal | 6 | 2 | 2 |
| apps/pdfmonkey | 2 | 3 | 2 |
| apps/pendo | 1 | 3 | 2 |
| apps/phantombuster | 2 | 3 | 2 |
| apps/placid | 2 | 3 | 2 |
| apps/plaid | 1 | 2 | 2 |
| apps/qdrant | 1 | 3 | 2 |
| apps/reddit | 1 | 3 | 2 |
| apps/relevanceai | 2 | 3 | 2 |
| apps/rendex | 1 | 2 | 2 |
| apps/rippling | 2 | 2 | 2 |
| apps/sanity | 3 | 2 | 2 |
| apps/sendy | 0 | 2 | 2 |
| apps/shippo | 1 | 3 | 2 |
| apps/signwell | 3 | 2 | 2 |
| apps/snowflake | 0 | 2 | 2 |
| apps/tailscale | 1 | 3 | 2 |
| apps/twitch | 1 | 2 | 2 |
| apps/wordpress | 1 | 3 | 2 |
| apps/wufoo | 1 | 3 | 2 |
| apps/xai | 1 | 3 | 2 |
| apps/adalo | 0 | 1 | 1 |
| apps/airparser | 1 | 2 | 1 |
| apps/apitemplateio | 1 | 2 | 1 |
| apps/assemblyai | 1 | 2 | 1 |
| apps/autotask | 2 | 1 | 1 |
| apps/aws/s3 | 1 | 2 | 1 |
| apps/bitly | 1 | 2 | 1 |
| apps/boldsign | 1 | 2 | 1 |
| apps/braintree | 1 | 2 | 1 |
| apps/brandfetch | 0 | 1 | 1 |
| apps/browserless | 1 | 2 | 1 |
| apps/clearbit | 0 | 1 | 1 |
| apps/cloudflare | 1 | 2 | 1 |
| apps/cognitoforms | 3 | 1 | 1 |
| apps/deepl | 1 | 2 | 1 |
| apps/deepseek | 0 | 1 | 1 |
| apps/documenso | 1 | 1 | 1 |
| apps/economic | 1 | 1 | 1 |
| apps/elastic | 1 | 2 | 1 |
| apps/expensify | 1 | 2 | 1 |
| apps/figma | 5 | 1 | 1 |
| apps/fillout | 1 | 2 | 1 |
| apps/firecrawl | 0 | 1 | 1 |
| apps/gladia | 1 | 2 | 1 |
| apps/glide | 1 | 2 | 1 |
| apps/google/gemini | 0 | 1 | 1 |
| apps/google/google-tasks | 1 | 2 | 1 |
| apps/gravityforms | 2 | 2 | 1 |
| apps/jev | 0 | 1 | 1 |
| apps/kintone | 1 | 2 | 1 |
| apps/line | 1 | 1 | 1 |
| apps/linkup | 6 | 4 | 1 |
| apps/mailcheck | 0 | 1 | 1 |
| apps/mailersend | 1 | 1 | 1 |
| apps/mastodon | 1 | 2 | 1 |
| apps/memberstack | 1 | 2 | 1 |
| apps/messagebird | 1 | 1 | 1 |
| apps/meta/facebook-conversions | 0 | 1 | 1 |
| apps/meta/whatsapp | 2 | 1 | 1 |
| apps/mistral | 0 | 1 | 1 |
| apps/netsuite | 0 | 1 | 1 |
| apps/neverbounce | 0 | 1 | 1 |
| apps/ollama | 0 | 1 | 1 |
| apps/ollama-cloud | 0 | 1 | 1 |
| apps/openrouter | 0 | 1 | 1 |
| apps/perplexity | 1 | 2 | 1 |
| apps/perspective | 1 | 2 | 1 |
| apps/pushover | 0 | 1 | 1 |
| apps/read-ai | 1 | 2 | 1 |
| apps/runway | 0 | 1 | 1 |
| apps/scoreapp | 1 | 2 | 1 |
| apps/sellsy | 2 | 1 | 1 |
| apps/servicenow | 2 | 2 | 1 |
| apps/signnow | 3 | 1 | 1 |
| apps/spotify | 1 | 1 | 1 |
| apps/strapi | 1 | 2 | 1 |
| apps/supadata | 0 | 1 | 1 |
| apps/tavily | 0 | 1 | 1 |
| apps/tldv | 2 | 1 | 1 |
| apps/wappalyzer | 1 | 2 | 1 |
| apps/wati | 1 | 2 | 1 |
| apps/webinarjam | 1 | 2 | 1 |
| apps/webscrapingai | 0 | 1 | 1 |
| apps/workflowy | 1 | 2 | 1 |
| apps/youcanbookme | 1 | 2 | 1 |
| apps/youform | 1 | 2 | 1 |
| apps/zoho/zoho-calendar | 1 | 3 | 1 |
| apps/zoho/zoho-sheet | 2 | 2 | 1 |
| apps/zoho/zoho-sign | 1 | 2 | 1 |
| apps/accelo | 4 | 0 | 0 |
| apps/acculynx | 8 | 15 | 0 |
| apps/actionnetwork | 1 | 0 | 0 |
| apps/ahrefs | 2 | 12 | 0 |
| apps/aidbase | 12 | 12 | 0 |
| apps/aircall | 7 | 11 | 0 |
| apps/airtable | 3 | 2 | 0 |
| apps/anchor | 8 | 11 | 0 |
| apps/apollo | 6 | 13 | 0 |
| apps/asana | 9 | 5 | 0 |
| apps/ashby | 8 | 16 | 0 |
| apps/atlassian/jira | 14 | 4 | 0 |
| apps/atlassian/trello | 21 | 2 | 0 |
| apps/attio | 4 | 13 | 0 |
| apps/authorize-net | 1 | 0 | 0 |
| apps/bannerbear | 11 | 12 | 0 |
| apps/betterstack | 11 | 12 | 0 |
| apps/bigcommerce | 11 | 17 | 0 |
| apps/box | 20 | 2 | 0 |
| apps/breezyhr | 6 | 11 | 0 |
| apps/bubble | 2 | 1 | 0 |
| apps/calendly | 9 | 4 | 0 |
| apps/checkly | 7 | 11 | 0 |
| apps/circle | 9 | 11 | 0 |
| apps/clickup | 20 | 5 | 0 |
| apps/companycam | 20 | 20 | 0 |
| apps/customerio | 4 | 0 | 0 |
| apps/dbtcloud | 11 | 12 | 0 |
| apps/deel | 8 | 12 | 0 |
| apps/dice | 3 | 0 | 0 |
| apps/discord | 5 | 5 | 0 |
| apps/document360 | 10 | 15 | 0 |
| apps/drata | 13 | 14 | 0 |
| apps/dropbox/dropbox | 2 | 2 | 0 |
| apps/ebay | 1 | 1 | 0 |
| apps/erpnext | 2 | 1 | 0 |
| apps/everhour | 10 | 23 | 0 |
| apps/fareharbor | 6 | 14 | 0 |
| apps/findymail | 5 | 12 | 0 |
| apps/followupboss | 10 | 11 | 0 |
| apps/front | 7 | 13 | 0 |
| apps/github | 15 | 3 | 0 |
| apps/gitlab | 13 | 4 | 0 |
| apps/givebutter | 8 | 11 | 0 |
| apps/google/gmail | 4 | 4 | 0 |
| apps/google/google-calendar | 7 | 2 | 0 |
| apps/google/google-drive | 5 | 3 | 0 |
| apps/google/google-forms | 3 | 2 | 0 |
| apps/google/google-sheets | 4 | 1 | 0 |
| apps/greenhouse | 2 | 17 | 0 |
| apps/gusto | 15 | 14 | 0 |
| apps/hibob | 7 | 13 | 0 |
| apps/hospitable | 9 | 12 | 0 |
| apps/housecallpro | 14 | 19 | 0 |
| apps/hubspot | 23 | 11 | 0 |
| apps/huggingface | 1 | 1 | 0 |
| apps/iclosed | 9 | 13 | 0 |
| apps/insightly | 8 | 4 | 0 |
| apps/intercom | 17 | 5 | 0 |
| apps/jenkins | 2 | 1 | 0 |
| apps/kajabi | 18 | 19 | 0 |
| apps/keap | 17 | 17 | 0 |
| apps/klaviyo | 2 | 0 | 0 |
| apps/knack | 1 | 1 | 0 |
| apps/leadfeeder | 7 | 10 | 0 |
| apps/lemonsqueezy | 10 | 11 | 0 |
| apps/lexware-office | 2 | 0 | 0 |
| apps/linear | 7 | 5 | 0 |
| apps/linkedin/linkedin | 2 | 1 | 0 |
| apps/linkedin/linkedin-conversions | 1 | 1 | 0 |
| apps/linkupapi | 7 | 20 | 0 |
| apps/livestorm | 9 | 13 | 0 |
| apps/loyverse | 2 | 0 | 0 |
| apps/mailchimp/mailchimp | 10 | 3 | 0 |
| apps/meistertask | 12 | 12 | 0 |
| apps/microsoft/outlook | 4 | 5 | 0 |
| apps/microsoft/teams | 8 | 8 | 0 |
| apps/millionverifier | 2 | 1 | 0 |
| apps/missive | 10 | 15 | 0 |
| apps/mollie | 9 | 15 | 0 |
| apps/mural | 9 | 12 | 0 |
| apps/notion | 42 | 30 | 0 |
| apps/omnisend | 1 | 1 | 0 |
| apps/onesignal | 1 | 0 | 0 |
| apps/openai | 2 | 2 | 0 |
| apps/outreach | 2 | 0 | 0 |
| apps/pardot | 2 | 0 | 0 |
| apps/payhip | 4 | 0 | 0 |
| apps/paystack | 3 | 0 | 0 |
| apps/pipedrive | 13 | 3 | 0 |
| apps/podium | 11 | 16 | 0 |
| apps/postgres | 1 | 0 | 0 |
| apps/practicebetter | 9 | 11 | 0 |
| apps/productboard | 12 | 20 | 0 |
| apps/productive | 2 | 17 | 0 |
| apps/pylon | 8 | 13 | 0 |
| apps/razorpay | 12 | 12 | 0 |
| apps/ringover | 6 | 11 | 0 |
| apps/rootly | 13 | 13 | 0 |
| apps/salesforce | 2 | 3 | 0 |
| apps/samcart | 8 | 19 | 0 |
| apps/seamlessai | 11 | 16 | 0 |
| apps/shopify | 18 | 4 | 0 |
| apps/shortcut | 12 | 13 | 0 |
| apps/simplero | 2 | 0 | 0 |
| apps/slack | 25 | 7 | 0 |
| apps/stackexchange | 11 | 32 | 0 |
| apps/stripe | 33 | 4 | 0 |
| apps/supabase | 1 | 1 | 0 |
| apps/superchat | 11 | 17 | 0 |
| apps/systemeio | 9 | 11 | 0 |
| apps/tapfiliate | 9 | 14 | 0 |
| apps/teamup | 7 | 13 | 0 |
| apps/telegram | 11 | 0 | 0 |
| apps/telnyx | 1 | 1 | 0 |
| apps/tiktok-lead-generation | 1 | 0 | 0 |
| apps/twilio/sendgrid | 1 | 0 | 0 |
| apps/twilio/twilio | 5 | 0 | 0 |
| apps/twist | 11 | 16 | 0 |
| apps/twitter | 1 | 1 | 0 |
| apps/typeform | 8 | 5 | 0 |
| apps/upsales | 17 | 18 | 0 |
| apps/uptimerobot | 2 | 2 | 0 |
| apps/vanta | 15 | 17 | 0 |
| apps/vero | 1 | 0 | 0 |
| apps/woocommerce | 10 | 3 | 0 |
| apps/yelp-leads | 1 | 0 | 0 |
| apps/zendesk/zendesk | 12 | 5 | 0 |
| apps/zeplin | 1 | 0 | 0 |
| apps/zoom | 22 | 4 | 0 |
| apps/zulip | 1 | 0 | 0 |

## webhook-api (66)

| app | triggers | candidates | verified | source | reason |
|---|---|---|---|---|---|
| apps/activecampaign | 1 | new-contact | apps/activecampaign/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/acuityscheduling | 3 | appointment-canceled, appointment-rescheduled, appointment-scheduled | apps/acuityscheduling/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/affinity | 1 | new-list-entry | apps/affinity/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/asana | 9 | any-event, new-comment, new-project, new-task, new-user, project-deleted, project-updated, task-deleted, task-updated | apps/asana/README.md Triggers section (verified 2026-11-10) | hand | shipped: webhook registered through the vendor API |
| apps/atlassian/bitbucket | 7 | issue-created, pull-request-comment, pull-request-created, pull-request-declined, pull-request-merged, pull-request-updated, push | apps/atlassian/bitbucket/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/atlassian/trello | 21 | any-event, board-member-added, board-updated, card-created, card-deleted, card-member-added, card-moved, card-updated, check-item-created, check-item-state-updated, checklist-added, comment-added, comment-updated, label-added-to-card, label-created, label-deleted, label-removed-from-card, label-updated, list-created, list-updated, new-card-in-list | apps/atlassian/trello/README.md Triggers section (verified 2026-11-10) | hand | shipped: webhook registered through the vendor API |
| apps/box | 20 | file-uploaded, file-trashed, file-deleted, file-restored, file-moved, file-copied, file-renamed, folder-created, folder-renamed, folder-moved, folder-copied, folder-trashed, folder-deleted, folder-restored, shared-link-created, shared-link-updated, shared-link-deleted, new-folder-item, new-or-updated-search-result, activity | apps/box/README.md Triggers section (verified 2026-11-10) | hand | shipped: signed webhooks registered through the vendor API (one trigger per file/folder/shared-link event, plus Item Activity for the rest), and polls over list-folder-items and search |
| apps/brevo | 1 | new-contact | apps/brevo/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/brex | 1 | event | apps/brex/README.md Triggers section (verified 2026-11-10) | hand | POST /v1/webhooks registers the callback and GET /v1/webhooks/secrets supplies the signing secrets at subscribe time; Webhook-Id/Timestamp/Signature (v1 base64 HMAC-SHA256 of id.timestamp.rawBody) verified within 5 minutes; Brex allows one endpoint per client, so one trigger with an eventTypes param |
| apps/cal | 3 | booking-cancelled, booking-created, booking-rescheduled | apps/cal/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/calendly | 9 | invitee-created, invitee-canceled, invitee-no-show-created, invitee-no-show-deleted, event-type-created, event-type-updated, event-type-deleted, routing-form-submission-created, any-event | apps/calendly/README.md Triggers section (verified 2026-11-10) | hand | shipped: webhooks registered through the vendor API, signed (Calendly-Webhook-Signature) |
| apps/clickup | 20 | any-event, folder-created, folder-deleted, folder-updated, list-created, list-deleted, list-updated, task-assignee-updated, task-comment-posted, task-comment-updated, task-created, task-deleted, task-due-date-updated, task-moved, task-priority-updated, task-status-updated, task-tag-updated, task-time-estimate-updated, task-time-tracked-updated, task-updated | apps/clickup/README.md Triggers section (verified 2026-11-10) | hand | shipped: webhook registered through the vendor API |
| apps/clockify | 6 | new-client, new-project, new-task, new-time-entry, timer-started, timer-stopped | apps/clockify/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/cloudconvert | 3 | job-finished, job-failed, job-created | apps/cloudconvert/README.md Triggers section (verified 2026-11-10) | hand | POST /v2/webhooks per subscription (events: one job event) returns the signing_secret kept in state, DELETE /v2/webhooks/{id} on unsubscribe; CloudConvert-Signature hex HMAC-SHA256 of the raw body (no timestamp) |
| apps/copper | 7 | new-company, new-lead, new-opportunity, new-person, new-task, updated-opportunity, updated-person | apps/copper/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/elastic-email | 7 | new-list, email-sent, email-opened, email-clicked, email-unsubscribed, email-error, abuse-report | apps/elastic-email/README.md Triggers section (verified 2026-11-10) | hand | shipped: signed notification webhooks registered through POST /v4/webhook (EnableSigning, PostJson; X-ElasticEmail-Signature v1 HMAC-SHA256 over timestamp, method, request target and raw body, 5-minute window); the earlier New List poll (list-list) is kept. |
| apps/eventbrite | 16 | activity, attendee-checked-in, attendee-checked-out, attendee-updated, event-created, event-published, event-unpublished, event-updated, order-placed, order-refunded, order-updated, organizer-updated, ticket-class-created, ticket-class-deleted, ticket-class-updated, venue-updated | no | hand | shipped: webhook registered through the vendor API |
| apps/exa | 2 | new-webset-item, webset-item-enriched | apps/exa/README.md Triggers section (verified 2026-11-10) | hand | shipped: Websets webhooks registered through POST /websets/v0/webhooks (webset.item.created, webset.item.enriched); Exa-Signature t=,v1= HMAC-SHA256 of '<t>.<raw body>' with the secret returned once at creation, 5-minute window. The research note 'unsigned monitors' was wrong: Exa signs both Monitors and Websets webhooks. |
| apps/figma | 5 | comment-added, file-deleted, file-updated, file-version-created, library-published | apps/figma/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/fivetran | 4 | new-connection, sync-started, sync-ended, connection-failure | apps/fivetran/README.md Triggers section (verified 2026-11-10) | hand | shipped: webhooks registered through POST /v1/webhooks/account (or /group/{id}) with a random per-subscription secret; X-Fivetran-Signature-256 hex HMAC-SHA256 of the raw body (no timestamp); the earlier New Connection poll (connection-list) is kept. |
| apps/flodesk | 4 | new-segment, new-subscriber, subscriber-unsubscribed, subscriber-added-to-segment | apps/flodesk/README.md Triggers section (verified 2026-11-10) | hand | shipped: webhooks registered through POST /v1/webhooks for the three events Flodesk publishes (subscriber.created, subscriber.unsubscribed, subscriber.added_to_segment; no updated or complaint event exists). Flodesk publishes no signature, so the README says the callback URL is the secret; the earlier New Segment poll (list-segments) is kept. |
| apps/formstack | 2 | new-submission, new-submission-poll | apps/formstack/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/github | 15 | any-event, fork, issue-comment, issue, pull-request-review-comment, pull-request-review, pull-request, push, ref-created, ref-deleted, release, repository-event, star, workflow-job, workflow-run | apps/github/README.md Triggers section (verified 2026-11-10) | hand | shipped: repository webhook registered through the vendor API (POST /repos/{owner}/{repo}/hooks); 14 named event triggers plus Any Event, X-Hub-Signature-256 HMAC-SHA256 verified |
| apps/gitlab | 13 | any-event, comment, deployment, issue, job, merge-request, milestone, new-project, pipeline, push, release, tag-push, wiki-page | apps/gitlab/README.md Triggers section (verified 2026-11-10) | hand | API-registered project webhook (POST /projects/:id/hooks); 11 named event triggers, the `new-project` poll trigger and Any Event; onSubscribe probes GET /version: 19+ or probe failure registers signing_token only (Standard Webhooks HMAC-SHA256 over id.timestamp.raw body, 5 min window, X-Gitlab-Token never consulted); a server reporting < 19.0 registers a separate random token checked in constant time |
| apps/gocanvas | 5 | submission-created, submission-edited, dispatch-created, workflow-handoff-created, submission-status-changed | apps/gocanvas/README.md Triggers section (verified 2026-11-10) | hand | API-registered form or company webhooks (POST /forms/{id}/webhooks, POST /webhooks); unsigned (no signature documented), callback URL is the secret; delivery body undocumented so passed through whole |
| apps/goto-webinar | 5 | registrant-added, registrant-joined, webinar-created, webinar-changed, survey-submitted | apps/goto-webinar/README.md Triggers section (verified 2026-11-10) | hand | API-registered (POST/PUT /webhooks + POST /userSubscriptions); X-Webhook-Signature base64 HMAC-SHA256 of timestamp:body under the webhook secret key, 300 s window; no poll: webinar list filters scheduled time, not creation |
| apps/gumroad | 2 | new-sale, sale-webhook | apps/gumroad/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/heartbeat | 8 | user-joined, user-updated, thread-created, group-joined, event-created, event-rsvp, course-completed, document-created | apps/heartbeat/README.md Triggers section (verified 2026-11-10) | hand | API-registered (PUT /webhooks, DELETE /webhooks/{id}); unsigned (no signature documented), callback URL is the secret; no poll: member and content lists are uncapped with no change filter |
| apps/helpscout | 4 | conversation-status-changed, customer-replied, new-conversation, new-customer | apps/helpscout/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/heygen | 2 | video-completed, video-failed | apps/heygen/README.md Triggers section (verified 2026-11-10) | hand | API-registered endpoint (POST /v3/webhooks/endpoints, one-time whsec secret kept in state); signature header hex HMAC-SHA256 of the raw body; no poll: GET /v3/videos documents no order or since filter |
| apps/invoiceninja | 2 | invoice-webhook, new-invoice | apps/invoiceninja/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/jotform | 2 | new-submission, submission-webhook | apps/jotform/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/judgeme | 2 | review-created, review-updated | apps/judgeme/README.md Triggers section (verified 2026-11-10) | hand | API-registered (POST/DELETE /webhooks, keys review/created and review/updated); JUDGEME-HMAC-SHA256 hex HMAC of the raw body under the Private API token; no poll: list-reviews has no sort or created-after filter |
| apps/lemlist | 2 | activity-webhook, new-activity | apps/lemlist/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/linear | 7 | issue, comment, project, cycle, issue-label, user, any-event | apps/linear/README.md Triggers section (verified 2026-11-10) | hand | webhook-api: signed webhookCreate-registered triggers for Issue, Comment, Project, Cycle, IssueLabel and User plus any-event; list actions are covered by those webhook triggers or skipped as reference data |
| apps/lokalise | 5 | key-added, key-modified, translation-updated, task-created, task-closed | apps/lokalise/README.md Triggers section (verified 2026-11-10) | hand | API-registered per-project webhooks (POST /projects/{id}/webhooks); Lokalise does not sign, it sends the webhook secret in X-Secret (shared-secret compare, body not bound) |
| apps/lusha | 1 | signal-received | apps/lusha/README.md Triggers section (verified 2026-11-10) | hand | API-registered subscriptions (POST /api/subscriptions, up to 25 entity ids); HMAC-SHA256 over timestamp.body with the account webhook secret, 300 s window, required ack body returned |
| apps/mailchimp/mailchimp | 10 | new-member, new-campaign, new-group-interest, member-subscribed, member-unsubscribed, member-updated, member-cleaned, email-changed, campaign-status, any-event | apps/mailchimp/mailchimp/README.md Triggers section (verified 2026-11-10) | hand | shipped: signed webhook-api triggers (the app registers the audience webhook and keeps its signing secret) plus polls over list-members, list-campaigns and list-group-interests |
| apps/mailchimp/mandrill | 1 | email-event | apps/mailchimp/mandrill/README.md Triggers section (verified 2026-11-10) | hand | API-registered webhook (POST webhooks/add returns auth_key); base64 HMAC-SHA1 over callback URL + POST variables; no timestamp, so a replayed delivery is not detected |
| apps/mailerlite | 4 | campaign-sent, new-subscriber, subscriber-unsubscribed, subscriber-updated | apps/mailerlite/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/mailgun | 1 | email-event | apps/mailgun/README.md Triggers section (verified 2026-11-09) | hand | API-registered per-domain webhooks (POST /v3/domains/{domain}/webhooks), HMAC-SHA256 over timestamp+token, 300 s window; body not bound by the signature |
| apps/mautic | 4 | contact-deleted, contact-updated, form-submitted, new-contact | apps/mautic/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/monday | 2 | item-created, column-value-changed | apps/monday/README.md Triggers section (verified 2026-11-10) | hand | create_webhook GraphQL mutation with challenge handshake; ordinary monday webhooks are unsigned (JWT only for integration-app tokens), so the callback URL is the secret (https://developer.monday.com/api-reference/docs/webhooks) |
| apps/onfleet | 6 | task-assigned, task-completed, task-created, task-failed, task-started, task-updated | apps/onfleet/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/patreon | 2 | new-pledge, post-published | apps/patreon/README.md Triggers section (verified 2026-11-10) | hand | POST /webhooks per trigger (members:pledge:create, posts:publish); X-Patreon-Signature is HMAC-MD5 of the body under the webhook secret returned at creation (https://docs.patreon.com/#webhooks) |
| apps/paypal | 6 | event, invoice-paid, order-approved, payment-captured, payment-refunded, payout-item-succeeded | apps/paypal/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/pipedrive | 13 | new-deal, new-person, person-updated, person-deleted, new-organization, organization-updated, organization-deleted, deal-updated, deal-deleted, new-activity, new-note, new-lead, any-event | apps/pipedrive/README.md Triggers section (verified 2026-11-10) | hand | shipped: webhooks (v2) registered through the vendor API with a random HTTP Basic password per subscription (Pipedrive does not sign deliveries); list actions covered by the created-event webhooks (the v1 list endpoints the actions call are no longer documented) |
| apps/pipefy | 4 | new-pipe, new-card, card-done, card-moved | apps/pipefy/README.md Triggers section (verified 2026-11-10) | hand | poll new-pipe kept; plus API-registered (createWebhook/deleteWebhook) card.create / card.done / card.move webhooks — Pipefy does not sign, so a random per-subscription secret is registered as a custom header and compared in constant time on each delivery (https://developers.pipefy.com/reference/pipe-table-webhooks) |
| apps/rendex | 1 | watch-event | apps/rendex/README.md Triggers section (verified 2026-11-10) | hand | Watch alerts (watch.changed/recovered/error) registered by PATCH /v1/watches/{id} webhookUrl, signed x-rendex-signature HMAC-SHA256 of timestamp.body (https://rendex.dev/docs/webhooks); job.*/batch.* callbacks not wired (completion callbacks) |
| apps/sanity | 3 | document-created, document-updated, document-deleted | apps/sanity/README.md Triggers section (verified 2026-11-10) | hand | GROQ-powered document webhook created via POST /hooks/projects/{projectId}, signed sanity-webhook-signature t=,v1= base64url HMAC-SHA256 (https://www.sanity.io/docs/webhooks) |
| apps/savvycal | 3 | event-created, event-canceled, event-rescheduled | apps/savvycal/README.md Triggers section (verified 2026-11-10) | hand | webhook registered via POST /v1/webhooks, signed x-savvycal-signature sha256=HMAC-SHA256 of the raw body (https://docs.savvycal.com/developers/webhooks) |
| apps/shopify | 18 | customer-created, customer-deleted, customer-updated, event, inventory-level-updated, location-created, location-deleted, location-updated, order-cancelled, order-created, order-deleted, order-fulfilled, order-paid, order-updated, product-created, product-deleted, product-updated, refund-created | apps/shopify/README.md Triggers section (verified 2026-11-10) | hand | shipped: webhook registered through the vendor API |
| apps/signnow | 3 | document-created, document-completed, invite-signed | apps/signnow/README.md Triggers section (verified 2026-11-10) | hand | user-level event subscription via POST /v2/event-subscriptions with a host-chosen secret_key, signed X-SignNow-Signature base64 HMAC-SHA256 of the body (https://docs.signnow.com/docs/signnow/webhooks) |
| apps/signwell | 3 | document-completed, document-signed, document-event | apps/signwell/README.md Triggers section (verified 2026-11-10) | hand | API-registered webhook (POST /api/v1/hooks, id kept for DELETE /hooks/{id}); event.hash = HMAC-SHA256 of type@time keyed with the webhook id, 300 s window; the body is not bound by the hash |
| apps/stripe | 33 | charge-captured, charge-failed, charge-refunded, charge-succeeded, charge-updated, checkout-completed, checkout-expired, customer-created, customer-deleted, customer-updated, event, invoice-created, invoice-deleted, invoice-finalized, invoice-paid, invoice-payment-failed, invoice-updated, invoice-voided, payment-failed, payment-intent-canceled, payment-intent-created, payment-succeeded, price-created, price-deleted, price-updated, product-created, product-deleted, product-updated, refund-created, refund-updated, subscription-canceled, subscription-created, subscription-updated | apps/stripe/README.md Triggers section (verified 2026-11-10) | hand | shipped: webhook registered through the vendor API (POST /v1/webhook_endpoints); 32 named event triggers plus the Any-event trigger `event`, Stripe-Signature HMAC-SHA256 verified with the endpoint secret |
| apps/surveymonkey | 1 | response-completed | apps/surveymonkey/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/telegram | 11 | callback-query, channel-post, chat-member-updated, edited-channel-post, edited-message, inline-query, new-message, poll, pre-checkout-query, shipping-query, update | apps/telegram/README.md Triggers section (verified 2026-11-10) | hand | shipped: webhook registered through the vendor API (setWebhook with a secret_token); one trigger per update type plus the Any-event trigger `update`; no list actions (https://core.telegram.org/bots/api#update) |
| apps/terraform | 4 | run-completed, run-errored, run-needs-attention, run-event | apps/terraform/README.md Triggers section (verified 2026-11-10) | hand | API-registered workspace notification configuration (generic destination, per-subscription random token); X-TFE-Notification-Signature = HMAC-SHA512 of the exact body, no timestamp in the scheme (replay not rejected) |
| apps/thrivecart | 4 | new-purchase, subscription-payment, subscription-cancelled, thrivecart-event | apps/thrivecart/README.md Triggers section (verified 2026-11-10) | hand | API-registered event subscriptions (POST /api/external/subscribe, removed by URL via /unsubscribe); unsigned (no signature documented), callback URL is the secret |
| apps/tiktok-lead-generation | 1 | new-lead | apps/tiktok-lead-generation/README.md Triggers section (verified 2026-11-10) | hand | signed lead webhook registered via POST /subscription/subscribe/ (subscribe_entity LEAD); TikTok-Signature t=,s= HMAC-SHA256 over t.rawBody keyed with the app secret (https://business-api.tiktok.com/portal/docs/webhook-verification/v1.3) |
| apps/toggl | 3 | project-created, time-entry-created, time-entry-updated | apps/toggl/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/typeform | 8 | new-response, new-partial-response, any-event, new-form, new-or-updated-form, new-workspace, new-theme, new-image | apps/typeform/README.md Triggers section (verified 2026-11-10) | hand | shipped: webhooks registered through the vendor API, signed (Typeform-Signature), plus list-backed polls for forms, workspaces, themes and images |
| apps/webex | 2 | new-membership, new-message | apps/webex/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/webflow | 4 | collection-item-changed, collection-item-created, form-submission, new-order | apps/webflow/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/woocommerce | 10 | customer-created, customer-deleted, customer-updated, event, order-created, order-deleted, order-updated, product-created, product-deleted, product-updated | apps/woocommerce/README.md Triggers section (verified 2026-11-10) | hand | shipped: webhook registered through the vendor API with a random per-subscription secret; created/updated/deleted for orders, customers and products plus `event` for any topic (https://woocommerce.github.io/woocommerce-rest-api-docs/#webhooks) |
| apps/zendesk/zendesk | 12 | new-ticket, ticket-status-changed, ticket-comment-added, ticket-deleted, ticket-priority-changed, ticket-assignee-changed, new-user, user-deleted, user-details-changed, new-organization, organization-deleted, any-event | apps/zendesk/zendesk/README.md Triggers section (verified 2026-11-10) | hand | shipped: signed event-subscription webhooks registered through the Webhooks API (X-Zendesk-Webhook-Signature, HMAC-SHA256 over timestamp+body, signing secret read from the API); list actions are covered by the created-event webhooks |

## manual-webhook (36)

| app | triggers | candidates | verified | source | reason |
|---|---|---|---|---|---|
| apps/adyen | 4 | payment-authorisation, payment-capture, payment-cancellation, payment-refund | apps/adyen/README.md Triggers section (verified 2026-11-10) | hand | Standard webhook created in the Customer Area (no registration API in this app); each notification item verified with Adyen's HMAC-SHA256 field signature (additionalData.hmacSignature, hex key, 8 ':'-joined fields; no timestamp) |
| apps/airparser | 1 | document-parsed | apps/airparser/README.md Triggers section (verified 2026-11-10) | hand | dashboard-created webhook (Integrations, Webhooks); airparser-signature base64 HMAC-SHA256 of the raw body under the per-webhook Signing Secret (no timestamp) |
| apps/atlassian/jira | 14 | new-issue, issue-created, issue-updated, issue-deleted, comment-created, comment-updated, comment-deleted, project-created, project-updated, project-deleted, user-created, user-updated, user-deleted, any-event | apps/atlassian/jira/README.md Triggers section (verified 2026-11-10) | hand | manual-webhook: 12 signed named triggers (X-Hub-Signature sha256, admin-created webhook with secret) plus any-event, and the new-issue poll over issue-search |
| apps/clearout | 3 | email-verifier-bulk-completed, email-finder-bulk-completed, form-guard-email-validated | apps/clearout/README.md Triggers section (verified 2026-11-10) | hand | webhook created in the Clearout app (Developers, Webhook; no API); x-co-webhook-signature t=<ts>,v1=<hex HMAC-SHA256 of ts.rawBody> under the account-level secret token, 5-minute window |
| apps/cognitoforms | 3 | entry-submitted, entry-updated, entry-deleted | apps/cognitoforms/README.md Triggers section (verified 2026-11-10) | hand | per-form Post JSON Data to a Website endpoints (submit, update, delete) set in the form builder; Cognito documents no signature, so the callback URL is the secret and the README says so (https://www.cognitoforms.com/support/66/data-integration/webhooks) |
| apps/customerio | 4 | customer-unsubscribed, email-clicked, email-opened, reporting-event | apps/customerio/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/dropbox/dropbox | 2 | new-file, files-changed | apps/dropbox/dropbox/README.md Triggers section (verified 2026-11-10) | hand | shipped: signed manual webhook (X-Dropbox-Signature, set up in the App Console) plus a poll over list-folder on one named folder capped at 600 entries |
| apps/esignatures | 5 | contract-event, contract-sent, contract-signed, signer-signed, signer-declined | apps/esignatures/README.md Triggers section (verified 2026-11-10) | hand | shipped: manual webhook (the dashboard holds one URL; no subscription API) verified with X-Signature-SHA256, an HMAC-SHA256 of the raw body under the account Secret Token (hex or base64; the vendor does not state the encoding; no timestamp). |
| apps/formspark | 1 | new-submission | apps/formspark/README.md Triggers section (verified 2026-11-10) | hand | shipped: manual webhook set per form in the dashboard (no webhook API); signing is optional at Formspark so the trigger requires it: Formspark-Signature v1= hex HMAC-SHA256 of '<Formspark-Timestamp>.<raw body>' under the pasted secret, 5-minute window. |
| apps/highlevel | 4 | contact-created, opportunity-created, appointment-created, inbound-message | apps/highlevel/README.md Triggers section (verified 2026-11-10) | hand | manual webhook set on the Marketplace app; X-GHL-Signature Ed25519 over the raw body verified with HighLevel's published public key (legacy RSA header deprecated 2026-09-01, not accepted); no poll: contact search has no order or since filter |
| apps/homeassistant | 1 | automation-event | apps/homeassistant/README.md Triggers section (verified 2026-11-10) | hand | manual webhook receiving rest_command calls from the user's automations (Home Assistant has no outbound event feed); unsigned, callback URL is the secret; no poll: state list is an uncapped snapshot with no change filter |
| apps/hubspot | 23 | any-event, company-created, company-deleted, company-updated, contact-created, contact-deleted, contact-updated, deal-created, deal-deleted, deal-updated, new-company, new-contact, new-deal, new-form, new-or-updated-company, new-or-updated-contact, new-or-updated-deal, new-or-updated-ticket, new-owner, new-ticket, ticket-created, ticket-deleted, ticket-updated | apps/hubspot/README.md Triggers section (verified 2026-11-10) | hand | shipped: signed manual-webhook receivers (user sets the Target URL in a HubSpot app) plus search and list polls |
| apps/intercom | 17 | conversation-created, contact-created, new-contact, contact-updated, contact-deleted, company-created, company-updated, company-deleted, new-conversation, conversation-user-replied, conversation-admin-replied, conversation-closed, conversation-assigned, conversation-deleted, any-event, new-note, new-tag | apps/intercom/README.md Triggers section (verified 2026-11-10) | hand | signed manual webhooks (X-Hub-Signature HMAC-SHA1, client secret) for contact, company and conversation topics plus Any Event; polls new-note (note-get-many read page by page, order-independent snapshot of note ids: the 2.11 reference the client pins documents no sort order) and new-tag (tag-get-many snapshot); company/contact/conversation lists covered by their created webhooks (no documented newest-first order on GET /conversations) |
| apps/line | 1 | event-received | apps/line/README.md Triggers section (verified 2026-11-10) | hand | manual webhook set in the LINE Developers Console; x-line-signature base64 HMAC-SHA256 of the raw body under the channel secret; one trigger carries message, follow, unfollow and postback (one URL per channel) |
| apps/marketo | 1 | lead-webhook | apps/marketo/README.md Triggers section (verified 2026-11-10) | hand | unsigned Smart Campaign Call Webhook step posting a user-defined payload; the callback URL is the secret |
| apps/messagebird | 1 | inbound-sms | apps/messagebird/README.md Triggers section (verified 2026-11-10) | hand | manual inbound-SMS callback (Flow Builder Forward to URL); MessageBird-Signature-JWT HS256 with url_hash and payload_hash verified; POST only (GET callbacks and status reports cannot be verified) |
| apps/meta/facebook | 2 | new-comment, page-feed | apps/meta/facebook/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/meta/facebook-lead-ads | 1 | new-lead | apps/meta/facebook-lead-ads/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/meta/facebook-messenger | 1 | messenger-event | apps/meta/facebook-messenger/README.md Triggers section (verified 2026-11-10) | hand | manual Page webhook in the Meta App Dashboard; GET verify-token challenge plus X-Hub-Signature-256 HMAC-SHA256 with the App Secret over the raw body |
| apps/meta/whatsapp | 2 | message-received, message-status | apps/meta/whatsapp/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/microsoft/azure-blob | 2 | blob-created, blob-deleted | apps/microsoft/azure-blob/README.md Triggers section (verified 2026-11-10) | hand | manual Event Grid webhook subscription (ARM registration needs Entra auth the shared-key credential lacks); Event Grid does not sign, validation handshake answered, callback URL is the secret |
| apps/mighty-networks | 3 | member-joined, post-created, network-event | apps/mighty-networks/README.md Triggers section (verified 2026-11-10) | hand | manual webhook set in Network settings; no signature, each delivery carries Authorization: Bearer <the API key configured on the webhook>, compared in constant time |
| apps/netlify | 3 | deploy, deploy-failed, deploy-succeeded | https://docs.netlify.com/api/get-started/ (fetched 2026-11-09, T2.08) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/notion | 42 | any-event, comment-created, comment-deleted, comment-updated, data-source-content-updated, data-source-created, data-source-deleted, data-source-schema-updated, database-created, database-deleted, file-upload-completed, file-upload-created, file-upload-expired, file-upload-upload-failed, new-agent, new-block, new-comment, new-data-source-template, new-database-page, new-file-upload, new-meeting-note, new-or-updated-data-source, new-or-updated-database, new-or-updated-database-page, new-or-updated-meeting-note, new-or-updated-page, new-or-updated-plugin, new-or-updated-session, new-session, new-session-event, new-view, new-workspace-user, page-content-updated, page-created, page-deleted, page-moved, page-properties-updated, page-transcript-deleted, page-undeleted, view-created, view-deleted, view-updated | apps/notion/README.md Triggers section (verified 2026-11-10) | hand | shipped 24 signed manual-webhook triggers (named created/updated/deleted-style events for page, database, data source, comment, view, file upload, page transcript + any-event, all 31 documented events mapped) and 18 poll triggers over the list actions |
| apps/payhip | 4 | new-sale, sale-refunded, new-subscription, subscription-cancelled | apps/payhip/README.md Triggers section (verified 2026-11-10) | hand | webhooks are set in the seller's Developer settings; body signature is sha256 of the API key (a shared token, not a body HMAC) (https://help.payhip.com/article/115-webhooks) |
| apps/peopledatalabs | 1 | person-updates | apps/peopledatalabs/README.md Triggers section (verified 2026-11-10) | hand | enterprise-only person-update webhook registered by the PDL team (no API); deliveries carry a customer-chosen shared-key header, checked in constant time (https://docs.peopledatalabs.com/docs/webhooks) |
| apps/phantombuster | 2 | new-agent, agent-run-finished | apps/phantombuster/README.md Triggers section (verified 2026-11-10) | hand | poll new-agent kept; added manual unsigned agent-run-finished webhook set per agent in the dashboard, callback URL is the secret (https://hub.phantombuster.com/docs/using-webhooks) |
| apps/posthog | 1 | event-captured | apps/posthog/README.md Triggers section (verified 2026-11-10) | hand | HTTP Webhook destination added by hand in PostHog; PostHog's POST /api/projects/:project_id/hog_functions/ (https://posthog.com/docs/api/hog-functions) could register it, queued as a webhook-api follow-up, not built; deliveries verified with the Standard Webhooks signature, secret required (https://posthog.com/docs/data-pipelines/destinations/webhook) |
| apps/slack | 25 | app-mention, channel-archived, channel-created, channel-deleted, channel-renamed, channel-unarchived, event, file-created, file-deleted, file-shared, member-joined-channel, member-left-channel, message-deleted, message-edited, new-message, new-search-match, reaction-added, reaction-removed, star-added, star-removed, team-join, user-updated, usergroup-created, usergroup-members-changed, usergroup-updated | apps/slack/README.md Triggers section (verified 2026-11-10) | hand | shipped: signed manual-webhook receivers (user registers the callback URL at the vendor) plus a newest-first search.messages poll |
| apps/strava | 3 | activity-created, activity-deleted, activity-updated | apps/strava/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/tldv | 2 | meeting-ready, transcript-ready | apps/tldv/README.md Triggers section (verified 2026-11-10) | hand | webhook set up inside tl;dv (user, team or organization level) with the trigger's callback URL; MeetingReady and TranscriptReady; unsigned (no signature documented), callback URL is the secret |
| apps/todoist | 3 | task-added, task-completed, task-updated | apps/todoist/README.md Triggers section (verified 2026-11-09) | hand | signed manual webhook (X-Todoist-Hmac-SHA256 base64 HMAC-SHA256, client secret); no poll shipped: task-get-many has a free-form filter (created after:) but it is day-granular, active-only and unverified live (assumed) |
| apps/twilio/twilio | 5 | incoming-message, message-status, call-status, call-summary-complete, any-event | apps/twilio/twilio/README.md Triggers section (verified 2026-11-10) | hand | shipped: signed manual-webhook receivers (user registers the callback URL at the vendor): SMS and call callbacks plus Event Streams; no list actions to poll |
| apps/vero | 1 | vero-event | apps/vero/README.md Triggers section (verified 2026-11-10) | hand | webhook set in Vero (Settings, Integrations, Webhooks) to one notification address; email events and user created/updated; unsigned (no signature documented), callback URL is the secret; Vero does not retry |
| apps/wise | 4 | balance-updated, profile-state-changed, transfer-payout-failed, transfer-state-changed | apps/wise/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/zoom | 22 | new-recording, new-meeting, new-webinar, new-user, meeting-created, meeting-updated, meeting-deleted, meeting-started, meeting-ended, meeting-registration-created, webinar-created, webinar-updated, webinar-deleted, webinar-started, webinar-ended, user-created, user-updated, user-deleted, recording-completed, recording-deleted, recording-trashed, any-event | apps/zoom/README.md Triggers section (verified 2026-11-10) | hand | shipped: signed manual-webhook triggers (Marketplace event subscription, Secret Token) plus polls over recording-get-many (date window), meeting-get-many, webinar-get-many and user-get-many (bounded snapshots); recording.deleted and recording.trashed have named triggers; group.* events are reachable through any-event |

## poll (480)

| app | triggers | poll action | candidates | verified | source | reason |
|---|---|---|---|---|---|---|
| apps/2chat | 1 | messages-list | new-message | apps/2chat/README.md Triggers section (verified 2026-11-10) | hand | messages-list returns the newest 100 messages first (https://developers.2chat.co/docs/API/WhatsApp/Web/messages/get-messages); webhooks are separate and not shipped |
| apps/accelo | 4 | activity-list | new-activity, new-or-updated-activity, new-company, new-job | apps/accelo/README.md Triggers section (verified 2026-11-10) | hand | list actions take the documented order_by_desc(<field>) filter (https://api.accelo.com/docs/): activity-list, company-list, job-list polled newest-first by id; new-or-updated-activity requests the documented date_modified field via _fields and orders activity-list by order_by_desc(date_modified), keyed on id:date_modified |
| apps/acculynx | 8 | job-list | new-job, new-or-updated-job, new-contact, new-invoice, new-job-estimate, new-job-representative, new-user, new-appointment | apps/acculynx/README.md Triggers section (verified 2026-11-10) | hand | poll triggers cover newest-first jobs, contacts and invoices, and bounded snapshots of per-job estimates and representatives, users and per-calendar appointments |
| apps/actionnetwork | 1 | person-list | new-person, new-or-updated-person | apps/actionnetwork/README.md Triggers section (verified 2026-11-09) | hand | People list supports documented created_date and modified_date filters with a rolling cursor (https://actionnetwork.org/docs/v2/). |
| apps/acumbamail | 1 | list-get-all | new-list | apps/acumbamail/README.md Triggers section (verified 2026-11-10) | hand | getLists returns every list in one request indexed by list ID (https://acumbamail.com/en/apidoc/function/getLists/); snapshot diff. campaigns-list not polled: getCampaigns documents only a dict 'List of campaigns' with no id keying or order |
| apps/addevent | 1 | event-template-list | new-event-template | apps/addevent/README.md Triggers section (verified 2026-11-09) | hand | Event-template list is documented newest-first (https://docs.addevent.com/reference/list-event-templates). |
| apps/agencyzoom | 1 | lead-list | new-lead | apps/agencyzoom/README.md Triggers section (verified 2026-11-09) | hand | Lead list supports the documented startDate creation-date filter with a rolling cursor (https://app.agencyzoom.com/openapi/agencyzoom.yaml). |
| apps/ahrefs | 2 | project-list | new-project, new-site-audit-crawl | apps/ahrefs/README.md Triggers section (verified 2026-11-10) | hand | snapshot of the management project collection plus finished Site Audit crawls from the free /site-audit/projects health-score list (https://docs.ahrefs.com/openapi.json) |
| apps/aidbase | 12 | ticket-list | new-chat, new-chatbot, new-chatbot-knowledge, new-email, new-email-inbox, new-email-inbox-knowledge, new-faq-item, new-knowledge-item, new-knowledge-sub-page, new-ticket, new-ticket-form, new-ticket-form-knowledge | apps/aidbase/README.md Triggers section (verified 2026-11-10) | hand | created_after since-window for tickets, chats and emails; whole-list snapshots for chatbots, inboxes, forms, knowledge and what is attached to each (https://docs.aidbase.ai/apis/chatbot-api/reference) |
| apps/aircall | 7 | call-list | new-call, new-contact, new-or-updated-contact, new-user, new-number, new-team, new-user-number | apps/aircall/README.md Triggers section (verified 2026-11-10) | hand | Newest-first polls (order=desc, documented) on calls, contacts, users, numbers and teams; contacts also by updated_at; a user's numbers as a bounded snapshot (https://developer.aircall.io/api-references/). |
| apps/airtable | 3 | search-records | new-record, new-or-updated-record, new-base | apps/airtable/README.md Triggers section (verified 2026-11-10) | hand | shipped poll triggers over search-records and list-bases; Airtable webhooks are ping-only and need a saved payload cursor (https://airtable.com/developers/web/api/webhooks-overview) |
| apps/alegra | 1 | contact-list | new-contact | apps/alegra/README.md Triggers section (verified 2026-11-09) | hand | Contact list supports descending ID order (https://developer.alegra.com/reference/listcontacts-1). |
| apps/algolia | 1 | index-list | new-index | apps/algolia/README.md Triggers section (verified 2026-11-09) | hand | Index list is a bounded account collection keyed by index name (https://www.algolia.com/doc/rest-api/search/list-indices). |
| apps/amplitude | 1 | cohort-list | new-cohort | apps/amplitude/README.md Triggers section (verified 2026-11-10) | hand | GET /api/3/cohorts returns the project's whole set of cohort definitions (https://amplitude.com/docs/apis/analytics/behavioral-cohorts); snapshot diff, added only. annotation-list not polled: project-wide list with no documented bound |
| apps/anchor | 8 | invoice-list | new-invoice, new-payout, new-contact, new-proposal, new-proposal-draft, new-agreement, new-proposal-template, new-service-template | apps/anchor/README.md Triggers section (verified 2026-11-10) | hand | Invoices and payouts newest-first (sortField/sortDirection=desc); contacts, proposals, drafts, agreements and templates have no sort or created-since filter, so they are bounded snapshots (https://docs.sayanchor.com/reference/pagination-filtering). |
| apps/anthropic | 1 | batch-list | new-batch | apps/anthropic/README.md Triggers section (verified 2026-11-10) | hand | batch-list returns 'Most recently created batches first' (https://platform.claude.com/docs/en/api/python/messages/batches/list); the API offers no batch webhook |
| apps/apify | 1 | actor-list | new-actor | apps/apify/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action actor-list |
| apps/apitemplateio | 1 | list-objects | new-object | apps/apitemplateio/README.md Triggers section (verified 2026-11-09) | hand | list-objects is documented by the existing action as a most-recent-first generated-object feed |
| apps/apollo | 6 | contact-search | new-contact, new-or-updated-contact, new-account, new-list, new-sequence, new-sequence-activity | apps/apollo/README.md Triggers section (verified 2026-11-10) | hand | contact-search and account-search document newest-created order (new-or-updated for contacts only: accounts carry no update stamp); lists and sequences are small bounded collections (snapshot); a contact's activity feed is documented newest-first (https://docs.apollo.io/reference/search-for-accounts) |
| apps/ashby | 8 | candidate-list | new-candidate, new-application, new-application-feedback, new-interview-schedule, new-job, new-job-posting, new-offer, new-user | apps/ashby/README.md Triggers section (verified 2026-11-10) | hand | poll triggers over createdAfter-filtered list actions (https://developers.ashbyhq.com/reference/candidatelist) plus whole-collection snapshots for users and job postings |
| apps/assemblyai | 1 | transcript-list | new-transcript | apps/assemblyai/README.md Triggers section (verified 2026-11-09) | hand | AssemblyAI documents transcript-list as newest-to-oldest |
| apps/atlassian/confluence | 2 | page-list | new-page, new-or-updated-page | apps/atlassian/confluence/README.md Triggers section (verified 2026-11-09) | hand | Page list supports newest-created and newest-modified order (https://dac-static.atlassian.com/cloud/confluence/openapi-v2.v3.json). |
| apps/atlassian/jira-data-center | 1 | comment-get-many | new-comment | apps/atlassian/jira-data-center/README.md Triggers section (verified 2026-11-09) | hand | Newest-first comment list per issue. |
| apps/atlassian/jira-service-management | 2 | servicedesk-get-many | new-service-desk, new-organization | apps/atlassian/jira-service-management/README.md Triggers section (verified 2026-11-10) | hand | servicedesk-get-many (GET /servicedesk, all service desks the user can access) and organization-get-many (GET /organization) are bounded id-keyed paged collections, polled as snapshots (https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-servicedesk/, .../api-group-organization/); request-search stays unpolled: ordered by latest activity, no created-since filter |
| apps/attio | 4 | list-tasks | new-task, new-record, new-list, new-workspace-member | apps/attio/README.md Triggers section (verified 2026-11-10) | hand | list-tasks sorts created_at:desc; list-records is queried with an explicit sorts created_at desc; lists and workspace members are small bounded collections (snapshot) (https://docs.attio.com/rest-api/endpoint-reference/records/list-records) |
| apps/auth0 | 1 | log-list | new-log | apps/auth0/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action log-list |
| apps/authorize-net | 1 | list-customer-transactions | new-customer-transaction | apps/authorize-net/README.md Triggers section (verified 2026-11-09) | hand | Customer transaction list explicitly sorts by submit time descending. |
| apps/autotask | 2 | entity-query | new-ticket, new-or-updated-ticket | apps/autotask/README.md Triggers section (verified 2026-11-10) | hand | entity-query (POST /Tickets/query) takes a JSON filter, so createDate > cursor (new-ticket) and lastActivityDate > cursor (new-or-updated-ticket, keyed id:lastActivityDate) are documented since-filters over Tickets datetime fields (https://autotask.net/help/developerhelp/Content/APIs/REST/Entities/TicketsEntity.htm) |
| apps/avoma | 1 | meeting-list | new-meeting | apps/avoma/README.md Triggers section (verified 2026-11-09) | hand | meeting-list with o=-start_at, page_size=100 and a rolling from/to window; late-synced older meetings are a documented residual (https://dev.avoma.com/openapi.yml) |
| apps/aweber | 1 | subscriber-find | new-subscriber | apps/aweber/README.md Triggers section (verified 2026-11-09) | hand | subscriber-find with sort_key=subscribed_at, sort_order=desc pinned (https://api.aweber.com/) |
| apps/aws/s3 | 1 | bucket-list | new-bucket | apps/aws/s3/README.md Triggers section (verified 2026-11-10) | hand | ListBuckets returns every bucket in one call (https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBuckets.html); snapshot diff. object-list is lexicographic by key, not by creation |
| apps/aws/ses | 3 | suppression-list | new-suppression, new-template, new-identity | apps/aws/ses/README.md Triggers section (verified 2026-11-10) | hand | ListSuppressedDestinations StartDate keeps addresses added after a date (https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_ListSuppressedDestinations.html); template-list and identity-list are per-region collections polled as snapshots |
| apps/axonaut | 2 | invoice-list | new-invoice, new-or-updated-invoice | apps/axonaut/README.md Triggers section (verified 2026-11-09) | hand | Invoice list has creation_date_after and updated_after filters (DD/MM/YYYY, date-only); triggers filter with a one-day overlap and dedupe by id (https://axonaut.com/api/v2/doc). |
| apps/balena | 1 | release-list | new-release | apps/balena/README.md Triggers section (verified 2026-11-09) | hand | release-list ($orderby=created_at desc, successful builds) wrapped; https://docs.balena.io/reference/api/resources/release/ |
| apps/bamboohr | 1 | list-employees | new-employee | apps/bamboohr/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-employees |
| apps/bannerbear | 11 | image-list | new-animation, new-animation-template, new-asset, new-batch, new-image, new-image-template, new-instant-url, new-publication, new-tool-job, new-workflow, new-workflow-run | apps/bannerbear/README.md Triggers section (verified 2026-11-10) | hand | newest-first page 1 of each v5 list endpoint; the reference says tool jobs are newest first and all lists share that polling shape (https://developers.bannerbear.com/v5/) |
| apps/baremetrics | 1 | customer-list | new-customer | apps/baremetrics/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action customer-list |
| apps/base44 | 1 | list-audit-logs | new-audit-log | apps/base44/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-audit-logs |
| apps/basecamp | 1 | project-list | new-project | apps/basecamp/README.md Triggers section (verified 2026-11-10) | hand | GET /projects.json is 'sorted by most recently created project first' (https://github.com/basecamp/bc3-api/blob/master/sections/projects.md); message and to-do events are webhook-only and not shipped |
| apps/baserow | 1 | row-list | new-row | apps/baserow/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action row-list |
| apps/beehiiv | 1 | post-list | new-post | apps/beehiiv/README.md Triggers section (verified 2026-11-09) | hand | Post list supports created descending order. |
| apps/beeminder | 1 | list-datapoints | new-datapoint | apps/beeminder/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-datapoints |
| apps/betterstack | 11 | incident-list | new-incident, new-monitor, new-heartbeat, new-monitor-group, new-escalation-policy, new-severity, new-status-page, new-on-call-calendar, new-status-report, new-status-page-resource, new-incident-comment | apps/betterstack/README.md Triggers section (verified 2026-11-10) | hand | Since-filter poll on incident-list (from date) plus snapshot polls (whole collection, 250/page, <=5000 rows) over each other list action; per-parent lists take the parent id as a param |
| apps/bexio | 1 | contact-list | new-contact | apps/bexio/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/bigcommerce | 11 | product-list | new-order, new-product, new-or-updated-product, new-customer, new-or-updated-customer, new-price-list, new-or-updated-price-list, new-brand, new-inventory-location, new-category-tree, new-or-updated-price-list-record | apps/bigcommerce/README.md Triggers section (verified 2026-11-10) | hand | Orders, products and customers poll with vendor-documented sort tokens (products by id for creation order); price lists, brands, inventory locations and category trees are small bounded collections diffed as snapshots; price list records use the documented date_modified:min filter for one chosen price list. |
| apps/bitly | 1 | list-bitlinks | new-bitlink | apps/bitly/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll: list-bitlinks gained an additive createdAfter input for the documented created_after filter (https://dev.bitly.com/api-reference/) |
| apps/bitrix24 | 1 | contact-list | new-contact | apps/bitrix24/README.md Triggers section (verified 2026-11-09) | hand | Contact list accepts DATE_CREATE descending order. |
| apps/bitwarden | 1 | event-list | new-event | apps/bitwarden/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll windowed by the documented start filter of event-list with continuation tokens; order-independent, id dedupe |
| apps/blandai | 1 | call-list | new-call | apps/blandai/README.md Triggers section (verified 2026-11-09) | hand | The existing call-list action explicitly requests newest-first calls with ascending=false |
| apps/bloomerang | 1 | list-transactions | new-or-updated-transaction | apps/bloomerang/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll: list-transactions takes lastModified (documented in Bloomerang's OpenAPI document); ids dedupe on Id + AuditTrail.LastModifiedDate |
| apps/bluesky | 1 | post-search | new-post | apps/bluesky/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action post-search |
| apps/boldsign | 1 | document-list | new-document | apps/boldsign/README.md Triggers section (verified 2026-11-09) | hand | Document list is newest activity first. |
| apps/booqable | 1 | customer-list | new-customer | apps/booqable/README.md Triggers section (verified 2026-11-09) | hand | Customer list accepts -created_at descending sort. |
| apps/braintree | 1 | transaction-search | new-transaction | apps/braintree/README.md Triggers section (verified 2026-11-09) | hand | Transaction search has a createdAt >= filter (createdFrom); the trigger filters cursor minus 120 s and dedupes by id, no default order assumed (https://developer.paypal.com/braintree/graphql/reference/). |
| apps/braze | 1 | campaign-list | new-or-updated-campaign | apps/braze/README.md Triggers section (verified 2026-11-09) | hand | Campaign list supports latest-edit descending order and update identity. |
| apps/breezyhr | 6 | candidate-search | new-candidate, new-position, new-or-updated-position, new-position-candidate, new-candidate-message, new-candidate-activity | apps/breezyhr/README.md Triggers section (verified 2026-11-10) | hand | Candidate search newest-first; a candidate's conversation and stream are documented newest-first; positions and a position's candidates are unpaged full lists diffed as snapshots (https://developer.breezy.hr/reference/listpositions). |
| apps/browseai | 1 | task-list | new-task | apps/browseai/README.md Triggers section (verified 2026-11-09) | hand | Task list sorted explicitly with sort=-createdAt (vendor default is ascending), page size capped at 10 (https://docs.browse.ai/api/). |
| apps/browserless | 1 | crawl-list | new-crawl | apps/browserless/README.md Triggers section (verified 2026-11-09) | hand | Page-walk poll: the crawl listing documents no order, so the trigger walks nextCursor (10 pages) and dedupes on id; response array is crawls |
| apps/bubble | 2 | data-list | new-thing, new-or-updated-thing | apps/bubble/README.md Triggers section (verified 2026-11-09) | hand | new-thing sorts data-list by Created Date desc; new-or-updated-thing by Modified Date desc |
| apps/buffer | 1 | post-list | new-post | apps/buffer/README.md Triggers section (verified 2026-11-09) | hand | post-list sorted createdAt desc; Buffer only sorts by createdAt/dueAt so no updated feed |
| apps/callrail | 1 | call-list | new-call | apps/callrail/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action call-list |
| apps/campaignmonitor | 1 | list-subscribers-get | new-subscriber | apps/campaignmonitor/README.md Triggers section (verified 2026-11-09) | hand | active subscribers ordered by date desc; list-stats-get is analytics and unused |
| apps/canny | 1 | post-list | new-post | apps/canny/README.md Triggers section (verified 2026-11-09) | hand | post-list sort=newest; no updated-time sort |
| apps/canva | 1 | list-designs | new-design | apps/canva/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-designs |
| apps/capsulecrm | 2 | opportunity-list | new-opportunity, new-or-updated-opportunity | apps/capsulecrm/README.md Triggers section (verified 2026-11-09) | hand | since (changed-since) filter, no documented order: cursor window + id dedupe |
| apps/certifier | 2 | credential-search | new-credential, new-or-updated-credential | apps/certifier/README.md Triggers section (verified 2026-11-09) | hand | credential-search sorted createdAt/updatedAt desc |
| apps/chargebee | 1 | list-events | new-event | apps/chargebee/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-events |
| apps/chatwork | 1 | room-message-list | new-message | apps/chatwork/README.md Triggers section (verified 2026-11-09) | hand | force=1 returns the latest 100 messages, re-sorted by send_time desc |
| apps/checkly | 7 | check-result-list | new-check-result, new-check-alert, new-check, new-or-updated-check, new-check-group, new-alert-channel, new-maintenance-window | apps/checkly/README.md Triggers section (verified 2026-11-10) | hand | Check results and alerts by documented from= since filter (alerts floor-guarded); checks, groups, alert channels and maintenance windows are bounded snapshots, no sort or created-since filter (https://api.checklyhq.com/openapi.json). |
| apps/circle | 9 | event-list | new-event, new-post, new-or-updated-post, new-comment, new-member-tag, new-space, new-space-group, new-event-attendee, new-space-member | apps/circle/README.md Triggers section (verified 2026-11-10) | hand | newest-first via documented sort/default order (events, posts sort=latest/latest_updated, comments, member tags sort=newest); bounded snapshots for spaces, space groups, one event's RSVPs, one space's members |
| apps/circleci | 1 | pipeline-list | new-pipeline | apps/circleci/README.md Triggers section (verified 2026-11-09) | hand | Page-walk poll: pipeline-list states no order, so the trigger walks next_page_token (10 pages), sorts by created_at and dedupes on id |
| apps/clerk | 2 | user-list | new-user, new-or-updated-user | apps/clerk/README.md Triggers section (verified 2026-11-09) | hand | order_by=-created_at / -updated_at via new optional orderBy input |
| apps/cleverreach | 1 | group-list | new-group | apps/cleverreach/README.md Triggers section (verified 2026-11-09) | hand | order=created DESC; changed-field name not verified so no updated trigger |
| apps/clickhouse | 1 | activity-list | new-activity | apps/clickhouse/README.md Triggers section (verified 2026-11-09) | hand | from_date filter, unpaged, id dedupe with cursor window |
| apps/clicksend | 1 | sms-history-list | new-sms | apps/clicksend/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action sms-history-list |
| apps/clientify | 4 | contact-list | new-contact, new-or-updated-contact, new-deal, new-or-updated-deal | apps/clientify/README.md Triggers section (verified 2026-11-09) | hand | Since-filter polls on the documented created[gte]/modified[gte] date filters of the contact and deal lists (https://developer.clientify.com) |
| apps/clio | 2 | contact-list | new-contact, new-or-updated-contact | apps/clio/README.md Triggers section (verified 2026-11-09) | hand | created_since / updated_since filters, id(asc) order: cursor window + id dedupe |
| apps/close | 1 | list-opportunities | new-opportunity | apps/close/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-opportunities |
| apps/cloudbeds | 2 | reservation-list | new-reservation, new-or-updated-reservation | apps/cloudbeds/README.md Triggers section (verified 2026-11-09) | hand | since-filter on reservation-list resultsFrom (booking date) / modifiedFrom, dedupe by reservationID (reservationID:dateModified for updated) |
| apps/cloudflare | 1 | dns-record-list | new-dns-record | apps/cloudflare/README.md Triggers section (verified 2026-11-09) | hand | Bounded snapshot: dns-record-list with per_page=5000 returns a zone's whole record set in one request (documented per_page max 5,000,000) |
| apps/cloudinary | 1 | asset-search | new-asset | apps/cloudinary/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action asset-search |
| apps/cloze | 3 | person-feed | new-or-updated-person, new-or-updated-company, new-or-updated-project | apps/cloze/README.md Triggers section (verified 2026-11-09) | hand | Change-feed polls on the cursored people/companies/projects feeds (pollToken); webhooks also exist, queued separately |
| apps/companycam | 20 | checklist-list | new-checklist, new-group, new-or-updated-checklist, new-or-updated-group, new-or-updated-project, new-or-updated-tag, new-or-updated-user, new-photo, new-photo-comment, new-photo-tag, new-project, new-project-assigned-user, new-project-collaborator, new-project-comment, new-project-document, new-project-invitation, new-project-label, new-tag, new-user, new-video | apps/companycam/README.md Triggers section (verified 2026-11-10) | hand | 20 poll triggers: since-filter (project modified_since, photo/video start_date), newest-updated-first checklists, and bounded snapshots of users, tags, groups and per-project/per-photo lists (https://docs.companycam.com/reference/listprojects) |
| apps/connecteam | 1 | shift-list | new-shift | apps/connecteam/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action shift-list |
| apps/constantcontact | 1 | list-contact-lists | new-contact-list | apps/constantcontact/README.md Triggers section (verified 2026-11-09) | hand | bounded snapshot (<=500 lists, no sort or date filter exists); added-only |
| apps/contentful | 1 | list-entries | new-entry | apps/contentful/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-entries |
| apps/contentstack | 2 | list-assets | new-asset, new-or-updated-asset | apps/contentstack/README.md Triggers section (verified 2026-11-09) | hand | list-assets takes desc=created_at / desc=updated_at |
| apps/crisp | 2 | list-conversations | new-conversation, new-or-updated-conversation | apps/crisp/README.md Triggers section (verified 2026-11-09) | hand | since-filter on filter_date_start (additive optional action param); new-conversation keeps created_at in window, dedupe by session_id; updated dedupes by session_id:updated_at |
| apps/cursor | 1 | members-list | new-member | apps/cursor/README.md Triggers section (verified 2026-11-09) | hand | members-list (GET /teams/members) returns the whole team roster in one unpaginated response with stable ids: bounded snapshot, emit added ids; audit-logs-list not wrapped (action sends startDate/endDate, docs say startTime/endTime, oldest first) (https://cursor.com/docs/account/teams/admin-api) |
| apps/databricks | 0 | catalog-list | job-run-finished | no | survey | AT RISK: no runs action; 8 actions are catalog/sql only. Needs a new action first or blocker. |
| apps/datadog | 1 | log-search | new-log | apps/datadog/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action log-search |
| apps/dbtcloud | 11 | run-list | new-run, new-project, new-or-updated-project, new-job, new-or-updated-job, new-environment, new-environment-variable, new-connection, new-group, new-service-token, new-user | apps/dbtcloud/README.md Triggers section (verified 2026-11-10) | hand | run-list newest-first (order_by=-id) plus snapshot polls over each other list action (returnAll, <=5000 rows); new-or-updated variants on updated_at |
| apps/deel | 8 | contract-list | new-contract, new-person, new-legal-entity, new-webhook, new-contract-milestone, new-time-off-request, new-timesheet, new-invoice-adjustment | apps/deel/README.md Triggers section (verified 2026-11-10) | hand | contract-list order_direction=desc plus snapshot polls over each other record list (100/page, <=5000 rows); timesheets and invoice adjustments watch a status set (default pending) |
| apps/deepgram | 1 | request-list | new-request | apps/deepgram/README.md Triggers section (verified 2026-11-09) | hand | request-list filters by date only (start/end truncate to YYYY-MM-DD) and the OpenAPI documents no order: the trigger reads yesterday and today (UTC) at limit 1000 over up to 5 pages, snapshots ids, and errors loudly at 5000 or more requests across those two days (https://developers.deepgram.com/openapi.json) |
| apps/deepl | 1 | glossary-list | new-glossary | apps/deepl/README.md Triggers section (verified 2026-11-09) | hand | GET /v2/glossaries returns every glossary in one unpaginated response: bounded snapshot, emit added ids (https://developers.deepl.com/api-reference/glossaries) |
| apps/deputy | 2 | employee-search | new-employee, new-or-updated-employee | apps/deputy/README.md Triggers section (verified 2026-11-09) | hand | QUERY sort Id desc / Modified desc |
| apps/devin | 2 | session-list | new-session, new-or-updated-session | apps/devin/README.md Triggers section (verified 2026-11-09) | hand | since-filter created_after / updated_after (no sort), dedupe by session_id |
| apps/dialpad | 1 | call-list | new-call | apps/dialpad/README.md Triggers section (verified 2026-11-09) | hand | call-list is documented reverse-chronological by call start time |
| apps/dice | 3 | orders-list | new-order, new-return, new-ticket-transfer | apps/dice/README.md Triggers section (verified 2026-11-09) | hand | orders-list/returns-list/ticket-transfers-list each take a documented on-or-after filter (purchasedAfter/returnedAfter/transferredAfter); since-filter poll with id dedupe (https://partners-endpoint.dice.fm/graphql/docs/index.html) |
| apps/diffbot | 1 | crawl-get | new-crawl-job | apps/diffbot/README.md Triggers section (verified 2026-11-09) | hand | crawl-get with no name lists every crawl/bulk job on the token: small bounded snapshot keyed by job name (https://docs.diffbot.com/reference/) |
| apps/digistore24 | 1 | list-purchases | new-purchase | apps/digistore24/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-purchases |
| apps/digitalocean | 1 | domain-record-list | new-domain-record | apps/digitalocean/README.md Triggers section (verified 2026-11-09) | hand | bounded snapshot (<=200 records per domain, no sort); added-only; larger domains fail loudly |
| apps/discord | 5 | list-messages | new-channel, new-guild, new-member, new-message, new-role | apps/discord/README.md Triggers section (verified 2026-11-10) | hand | Get Channel Messages returns messages newest to oldest, limit 100 (https://discord.com/developers/docs/resources/message#get-channel-messages); servers, channels, roles and members are bounded snapshots via their list actions (no newest-first order or since filter in the HTTP API); Webhook Events are app-level only and need a 204 acknowledgement the w6w ingest route cannot send (https://discord.com/developers/docs/events/webhook-events) |
| apps/discourse | 1 | topic-list-latest | new-topic | apps/discourse/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action topic-list-latest |
| apps/dixa | 1 | agent-list | new-agent | apps/dixa/README.md Triggers section (verified 2026-11-09) | hand | agent-list over the whole roster via pageKey is the organisation's staff: bounded snapshot, emit added ids (https://docs.dixa.io/openapi/dixa-api/v1/tag/Agents/) |
| apps/docparser | 1 | results-list | new-result | apps/docparser/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action results-list |
| apps/documenso | 1 | envelope-find | new-envelope | apps/documenso/README.md Triggers section (verified 2026-11-09) | hand | GET /envelope documents orderByDirection default desc with sole sort column createdAt, so page 1 is newest (https://app.documenso.com/api/v2/openapi.json); webhook upgrade also queued |
| apps/document360 | 10 | workspace-article-list | new-article, new-or-updated-article, new-article-version, new-drive-folder, new-project, new-reader, new-team-group, new-team-account, new-workspace-category, new-workspace | apps/document360/README.md Triggers section (verified 2026-11-10) | hand | bounded snapshot triggers cover Document360 record collections |
| apps/documerge | 1 | document-list | new-document | apps/documerge/README.md Triggers section (verified 2026-11-09) | hand | the OpenAPI lists no pagination or filter parameters for GET /api/documents (parameters: []), so one response is treated as the whole collection: bounded snapshot (https://app.documerge.ai/api-docs/openapi.yaml) |
| apps/docuseal | 1 | submitter-list | new-completed-submitter | apps/docuseal/README.md Triggers section (verified 2026-11-09) | hand | submitter-list takes documented completed_after filter; since-filter poll with id dedupe; submission-list has no date filter or documented order (https://www.docuseal.com/docs/api) |
| apps/docusign | 2 | envelope-list | new-envelope, new-or-updated-envelope | apps/docusign/README.md Triggers section (verified 2026-11-09) | hand | order_by=created\|status_changed with order=desc and a 30-day from_date |
| apps/donorbox | 1 | event-list | new-event | apps/donorbox/README.md Triggers section (verified 2026-11-09) | hand | event-list takes the documented order=desc (default desc); first page holds the newest events |
| apps/drata | 13 | event-list | new-asset, new-control, new-device, new-event, new-evidence, new-monitoring-test, new-personnel, new-policy, new-risk, new-risk-register, new-user, new-vendor, new-workspace | apps/drata/README.md Triggers section (verified 2026-11-10) | hand | Newest-first polls (sort=createdAt, sortDir=DESC, documented on each v2 list endpoint) for the main record lists plus the since-filter event poll. |
| apps/drip | 1 | list-subscribers | new-subscriber | apps/drip/README.md Triggers section (verified 2026-11-09) | hand | list-subscribers takes documented subscribed_after (created after) filter; since-filter poll with id dedupe (https://developer.drip.com/#list-all-subscribers) |
| apps/dropbox/dropbox-sign | 1 | signature-request-list | new-signature-request | apps/dropbox/dropbox-sign/README.md Triggers section (verified 2026-11-09) | hand | New Signature Request polls signature-request-list with the documented search filter created:[yesterday TO today] (UTC days) and dedupes by signature_request_id; sent/viewed/signed/declined callback events also exist (queued as an upgrade). |
| apps/dub | 1 | customer-list | new-customer | apps/dub/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action customer-list |
| apps/duda | 1 | list-sites | new-site | apps/duda/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-sites |
| apps/dust | 2 | agent-list | new-agent, new-space | apps/dust/README.md Triggers section (verified 2026-11-09) | hand | New Agent and New Space diff the unpaginated agent_configurations and spaces collections (pollSnapshot, added only); Dust webhooks are inbound triggers into agents, not outbound events. |
| apps/easypost | 1 | event-list | new-event | apps/easypost/README.md Triggers section (verified 2026-11-09) | hand | events feed pages from the newest with before_id; start_datetime defaults to one month back |
| apps/ebay | 1 | item-search | new-listing | apps/ebay/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action item-search |
| apps/economic | 1 | invoice-booked-list | new-booked-invoice | apps/economic/README.md Triggers section (verified 2026-11-09) | hand | invoice-booked-list sorts -bookedInvoiceNumber (newest first) |
| apps/ecwid | 1 | customer-search | new-customer | apps/ecwid/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action customer-search |
| apps/egnyte | 1 | link-list | new-link | apps/egnyte/README.md Triggers section (verified 2026-11-09) | hand | link-list has a created_after filter: since-filter shape with id dedupe (replaces round-1 search-based rejection) |
| apps/elastic | 1 | search | new-record | apps/elastic/README.md Triggers section (verified 2026-11-09) | hand | search sorted by a user-named creation timestamp field descending |
| apps/elevenlabs | 1 | voice-list | new-voice | apps/elevenlabs/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action voice-list |
| apps/emailoctopus | 3 | list-contacts | new-contact, new-or-updated-contact, new-list | apps/emailoctopus/README.md Triggers section (verified 2026-11-09) | hand | new-contact/new-or-updated-contact poll created_at.gte / last_updated_at.gte following paging.next up to 5 pages (idOf id:last_updated_at); new-list diffs the paginated lists collection; the v2 API publishes no webhooks. |
| apps/encharge | 1 | segment-people-list | new-segment-person | apps/encharge/README.md Triggers section (verified 2026-11-09) | hand | segment-people-list sort+order=desc on a user-named creation-time person field (sort field name is user-supplied, not documented by the vendor) |
| apps/erpnext | 2 | list-documents | new-document, new-or-updated-document | apps/erpnext/README.md Triggers section (verified 2026-11-09) | hand | list-documents order_by creation desc / modified desc over a user-chosen DocType |
| apps/everhour | 10 | project-list | new-client, new-invoice, new-project, new-task, new-section, new-expense, new-user, new-assignment, new-time-record, new-timecard | apps/everhour/README.md Triggers section (verified 2026-11-10) | hand | Bounded snapshot polls over every record list Everhour offers (lists are bare arrays with no order or since filter, https://developers.everhour.com/pagination.md); time records and timecards diff a look-back window of work dates. Webhooks are queued separately. |
| apps/expensify | 1 | list-policies | new-policy | apps/expensify/README.md Triggers section (verified 2026-11-09) | hand | New Policy diffs the unpaginated get/policyList job (pollSnapshot, added only); export-reports is an export job with no created-since cursor and the Integration Server documents no webhooks. |
| apps/eztexting | 1 | contact-list | new-contact | apps/eztexting/README.md Triggers section (verified 2026-11-09) | hand | contact-list sort=created,desc is the documented example (https://developers.eztexting.com/reference/list-1) |
| apps/fareharbor | 6 | booking-list-by-create-date | new-agent, new-booking, new-company, new-item, new-or-updated-item, new-user | apps/fareharbor/README.md Triggers section (verified 2026-11-10) | hand | New Booking polls the create-date booking feed; items, users, agents and companies are snapshot-diffed through their list actions. |
| apps/fathom | 1 | meeting-get-many | new-meeting | apps/fathom/README.md Triggers section (verified 2026-11-09) | hand | meeting-get-many lists meetings newest first, no sort arg |
| apps/feedly | 1 | articles-collect | new-article | apps/feedly/README.md Triggers section (verified 2026-11-09) | hand | New Article polls GET /v3/streams/contents with newerThan = previous check minus 2 min and dedupes by article id; enterprise trigger webhooks are queued as an upgrade. |
| apps/fellow | 1 | action-item-list | new-action-item | apps/fellow/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action action-item-list |
| apps/fillout | 1 | submission-list | new-submission | apps/fillout/README.md Triggers section (verified 2026-11-09) | hand | submission-list sort=desc (default is asc) over a user-chosen form |
| apps/findymail | 5 | list-lists | new-list, new-signal, new-monitor, new-exclusion-list, new-list-contact | apps/findymail/README.md Triggers section (verified 2026-11-10) | hand | Snapshot polls over the unpaginated lists (contact lists, exclusion lists, a list's contacts), list-monitors newest-first, and a since-filter poll on list-signals (date_from, detected_at floor) |
| apps/fireberry | 1 | query-records | new-record | apps/fireberry/README.md Triggers section (verified 2026-11-09) | hand | New Record runs the v3 query for a chosen object ordered by createdon desc (documented orderBy) and dedupes by _id; the developer docs describe no webhooks. |
| apps/fireflies | 1 | transcript-search | new-transcript | apps/fireflies/README.md Triggers section (verified 2026-11-09) | hand | New Transcript polls transcripts(fromDate = now - 2 days) by meeting date and dedupes by id; Webhooks V2 (meeting.transcribed, meeting.summarized, meeting.bot_joined, HMAC-SHA256 X-Hub-Signature) is queued as an upgrade. |
| apps/firestore | 1 | document-list | new-document | apps/firestore/README.md Triggers section (verified 2026-11-09) | hand | document-list orderBy a user-named creation timestamp field desc; Firestore has no built-in creation ordering |
| apps/float | 2 | allocation-list | new-allocation, new-or-updated-allocation | apps/float/README.md Triggers section (verified 2026-11-09) | hand | allocation-list sort=-created / -modified (a - prefix sorts descending) |
| apps/folk | 1 | list-groups | new-group | apps/folk/README.md Triggers section (verified 2026-11-09) | hand | unpaginated group collection is snapshotted for additions |
| apps/followupboss | 10 | search-people | new-person, new-or-updated-person, new-deal, new-task, new-lead-event, new-appointment, new-user, new-pipeline, new-smart-list, new-action-plan | apps/followupboss/README.md Triggers section (verified 2026-11-10) | hand | people sort -created/-updated; deals, tasks, events, appointments, users default to reverse id order (https://docs.followupboss.com/reference/pagination); bounded snapshots for pipelines, smart lists, action plans |
| apps/formbricks | 1 | survey-list | new-survey | apps/formbricks/README.md Triggers section (verified 2026-11-09) | hand | workspace survey collection is snapshotted for additions |
| apps/formsite | 1 | result-list | new-result | apps/formsite/README.md Triggers section (verified 2026-11-09) | hand | result-list with sort_direction=desc on the documented default result_id sort |
| apps/formstack-documents | 1 | document-list | new-document | apps/formstack-documents/README.md Triggers section (verified 2026-11-09) | hand | unpaginated document template collection is snapshotted for additions |
| apps/freeagent | 2 | contact-list | new-contact, new-or-updated-contact | apps/freeagent/README.md Triggers section (verified 2026-11-09) | hand | contact-list sort=-created_at / -updated_at; identity is the contact url |
| apps/freshbooks | 1 | invoice-list | new-or-updated-invoice | apps/freshbooks/README.md Triggers section (verified 2026-11-09) | hand | polls invoice-list with documented search[updated_min] (day granularity) and dedupes on id+updated (https://www.freshbooks.com/api/invoices) |
| apps/freshworks/freshdesk | 2 | ticket-get-many | new-ticket, new-or-updated-ticket | apps/freshworks/freshdesk/README.md Triggers section (verified 2026-11-09) | hand | ticket-get-many order_by created_at/updated_at order_type=desc |
| apps/freshworks/freshsales | 2 | contact-get-many | new-contact, new-or-updated-contact | apps/freshworks/freshsales/README.md Triggers section (verified 2026-11-09) | hand | contact-get-many on a saved view, sort created_at/updated_at sort_type=desc |
| apps/freshworks/freshservice | 2 | ticket-get-many | new-ticket, new-or-updated-ticket | apps/freshworks/freshservice/README.md Triggers section (verified 2026-11-09) | hand | ticket-get-many order_type=desc for new; updated_since filter (since-filter poll) for updated |
| apps/front | 7 | conversation-list | new-or-updated-contact, new-conversation, new-or-updated-conversation, new-inbox, new-channel, new-tag, new-teammate | apps/front/README.md Triggers section (verified 2026-11-10) | hand | poll triggers over conversation-list (newest activity first, sort_order=desc, created_at/updated_at floor), contact-list since-filter, and whole-collection snapshots for inboxes, channels, tags and teammates |
| apps/gamma | 1 | list-gamma-comments | new-or-updated-gamma-comment | apps/gamma/README.md Triggers section (verified 2026-11-09) | hand | list-gamma-comments has the updatedSince filter and no sort, so only a since-filter new-or-updated trigger fits |
| apps/gerrit | 1 | change-search | new-or-updated-change | apps/gerrit/README.md Triggers section (verified 2026-11-09) | hand | change-search output is documented sorted most-recently-updated first; only the update-ordered trigger fits (no created-order sort documented) |
| apps/getresponse | 1 | contact-list | new-contact | apps/getresponse/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/ghost | 1 | list-posts | new-post | no | hand | shipped poll trigger(s) over list action list-posts |
| apps/gitea | 1 | pull-request-list | new-or-updated-pull-request | apps/gitea/README.md Triggers section (verified 2026-11-09) | hand | pull-request-list sort=recentupdate (documented sort enum has no created-order value), state=all; only the update-ordered trigger fits |
| apps/givebutter | 8 | contact-list | new-contact, new-or-updated-contact, new-transaction, new-or-updated-transaction, new-campaign, new-fund, new-payout, new-message | apps/givebutter/README.md Triggers section (verified 2026-11-10) | hand | sortByDesc=created_at for contacts and transactions; updatedAfter since-filter for updates; bounded snapshots for campaigns, funds, payouts, messages |
| apps/gladia | 1 | transcription-list | new-transcription | apps/gladia/README.md Triggers section (verified 2026-11-09) | hand | transcription-list has no documented order, so a since-filter poll on after_date |
| apps/glide | 1 | table-list | new-table | apps/glide/README.md Triggers section (verified 2026-11-09) | hand | Big Table collection is snapshotted for additions |
| apps/gocardless | 1 | list-customers | new-customer | apps/gocardless/README.md Triggers section (verified 2026-11-09) | hand | Newest-created customer page is polled. |
| apps/google/bigquery | 1 | job-list | new-job-list | apps/google/bigquery/README.md Triggers section (verified 2026-11-09) | hand | Existing jobs list is polled. |
| apps/google/gmail | 4 | get-many-messages | new-email, new-or-updated-thread, new-label, new-draft | apps/google/gmail/README.md Triggers section (verified 2026-11-10) | hand | polls over get-many-messages (since-filter), get-many-threads (since-filter), get-many-labels and get-many-drafts (snapshots); no webhook: users.watch needs a Cloud Pub/Sub topic and stops after 7 days without a renewal call (https://developers.google.com/workspace/gmail/api/guides/push) |
| apps/google/google-business-profile | 1 | list-questions | new-question | apps/google/google-business-profile/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-questions |
| apps/google/google-calendar | 7 | list-events | event-changed, new-event, event-updated, event-cancelled, event-started, event-ended, new-calendar | apps/google/google-calendar/README.md Triggers section (verified 2026-11-10) | hand | poll triggers over list-events (sync feed for created/updated/cancelled, timeMin/timeMax window for started/ended) and list-calendars (snapshot); push channels carry no event data and expire (https://developers.google.com/workspace/calendar/api/guides/push); new-event is created-only on a best-effort basis: a sync-feed item shows the latest state, so an event edited again after creation (more than 2 s) reads as updated and is reported by event-updated, not new-event (n8n eventCreated is therefore approximated) |
| apps/google/google-contacts | 1 | list-contact-groups | new-contact-group | apps/google/google-contacts/README.md Triggers section (verified 2026-11-09) | hand | Contact groups page of 200 (fits the kit's seen window) is polled; order undocumented. |
| apps/google/google-drive | 5 | file-list | new-file, new-or-updated-file, new-folder, new-or-updated-folder, new-shared-drive | apps/google/google-drive/README.md Triggers section (verified 2026-11-10) | hand | shipped poll triggers over file-list (createdTime/modifiedTime desc) and drive-list; no webhook because Drive push channels carry no data and have no automatic renewal (https://developers.google.com/workspace/drive/api/guides/push) |
| apps/google/google-forms | 3 | list-forms | new-form, new-or-updated-form, new-response | apps/google/google-forms/README.md Triggers section (verified 2026-11-10) | hand | poll list-forms (Drive, newest-first) and response-list (timestamp since-filter); forms.watches delivers only to Cloud Pub/Sub (https://developers.google.com/workspace/forms/api/guides/push-notifications) |
| apps/google/google-meet | 1 | list-conference-records | new-conference-record | apps/google/google-meet/README.md Triggers section (verified 2026-11-09) | hand | conference records are documented newest-started-first |
| apps/google/google-sheets | 4 | sheet-read | row-added, row-added-or-updated, row-updated, new-sheet | apps/google/google-sheets/README.md Triggers section (verified 2026-11-10) | hand | poll sheet-read, diff rows against seeded snapshot; new-sheet snapshots list-sheets |
| apps/google/google-tasks | 1 | list-tasks | new-or-updated-task | apps/google/google-tasks/README.md Triggers section (verified 2026-11-09) | hand | tasks.list supports updatedMin and the trigger deduplicates a bounded overlap |
| apps/google/googlechat | 1 | list-messages | new-message | apps/google/googlechat/README.md Triggers section (verified 2026-11-09) | hand | Messages are requested in descending create-time order. |
| apps/google/youtube | 1 | list-comment-threads | new-comment-thread | apps/google/youtube/README.md Triggers section (verified 2026-11-09) | hand | Comment threads are requested in time order. |
| apps/gorgias | 2 | customer-get-many | new-customer, new-or-updated-customer | apps/gorgias/README.md Triggers section (verified 2026-11-09) | hand | Customers support created and updated descending ordering. |
| apps/gotify | 1 | message-list | new-message | apps/gotify/README.md Triggers section (verified 2026-11-09) | hand | Existing bounded messages page is polled. |
| apps/grafana | 1 | dashboard-list | new-dashboard | apps/grafana/README.md Triggers section (verified 2026-11-09) | hand | dashboard search is capped at 5,000 records and is snapshotted for added dashboards (https://grafana.com/docs/grafana/latest/developers/http_api/folder_dashboard_search/); read to the 5,000 limit, so dashboards beyond it are neither seen nor reported |
| apps/grain | 1 | recording-list | new-recording | apps/grain/README.md Triggers section (verified 2026-11-09) | hand | Recording list documents no order; polled with filter.after_datetime since-filter plus id dedupe (shape b); filter direction unverifiable live. |
| apps/granola | 1 | audit-event-list | new-audit-event | apps/granola/README.md Triggers section (verified 2026-11-09) | hand | Audit log is oldest-first with page_size max 30; polled with occurred_after since-filter plus id dedupe (shape b). |
| apps/gravityforms | 2 | entry-get-many | new-entry, new-or-updated-entry | apps/gravityforms/README.md Triggers section (verified 2026-11-09) | hand | Entries support created and updated descending ordering. |
| apps/greenhouse | 2 | list-applications | new-interview, new-application-stage, new-application, new-attachment, new-candidate, new-department, new-job-interview-stage, new-job-post, new-job, new-note, new-offer, new-office, new-opening, new-rejection-reason, new-scorecard, new-source, new-user, new-or-updated-application-stage, new-or-updated-application, new-or-updated-attachment, new-or-updated-candidate, new-or-updated-department, new-or-updated-interview, new-or-updated-job-interview-stage, new-or-updated-job-post, new-or-updated-job, new-or-updated-note, new-or-updated-offer, new-or-updated-office, new-or-updated-opening, new-or-updated-rejection-reason, new-or-updated-scorecard, new-or-updated-source, new-or-updated-user | apps/greenhouse/README.md Triggers section (verified 2026-11-10) | hand | Each Harvest v3 list action is covered by a created_at or updated_at since-filter poll with cursor continuation and id dedupe. |
| apps/guru | 1 | card-search | new-card | apps/guru/README.md Triggers section (verified 2026-09-05) | hand | shipped poll trigger(s) over list action card-search |
| apps/gusto | 15 | event-list | new-contractor, new-contractor-payment, new-department, new-employee, new-employee-home-address, new-event, new-garnishment, new-job-compensation, new-or-updated-contractor, new-or-updated-contractor-payment, new-or-updated-employee, new-or-updated-payroll, new-or-updated-time-off-request, new-payroll, new-time-off-request | apps/gusto/README.md Triggers section (verified 2026-11-10) | hand | New Event uses Gusto's descending event feed; employees, contractors, payrolls, time off, contractor payments, departments and per-parent histories are snapshot-diffed through their list actions. |
| apps/hackernews | 1 | list-new-stories | new-story | apps/hackernews/README.md Triggers section (verified 2026-11-09) | hand | the official API documents /v0/newstories.json as the newest stories, capped at 500 ids; event is {id} (https://github.com/HackerNews/API) |
| apps/harvest | 1 | task-get-many | new-task | apps/harvest/README.md Triggers section (verified 2026-11-09) | hand | Task page exposes stable task IDs. |
| apps/hex | 1 | user-list | new-user | apps/hex/README.md Triggers section (verified 2026-11-09) | hand | shape c: /v1/users has only NAME/EMAIL sorts, so the trigger walks every page (limit 500, after cursor) and snapshots user ids; walk past the 5000-row cap throws (https://static.hex.site/openapi.json) |
| apps/heyreach | 1 | list-get-leads | new-lead | apps/heyreach/README.md Triggers section (verified 2026-11-09) | hand | shape b: createdFrom since-filter (cursor minus 2 min) on list-get-leads, every page of the window read, deduped by lead id (https://docs.heyreach.io/openapi.json) |
| apps/hibob | 7 | tasks-list | new-attendance-entry, new-employee, new-employment-history-entry, new-lifecycle-history-entry, new-or-updated-employee, new-task, new-work-history-entry | apps/hibob/README.md Triggers section (verified 2026-11-10) | hand | New Task snapshots the open-task endpoint; employees, employee tables and attendance are snapshot-diffed through their existing read/search actions. |
| apps/honeybook | 1 | project-list | new-project | no | hand | shipped poll trigger(s) over list action project-list |
| apps/hospitable | 9 | reservation-list | new-reservation, new-property, new-payout, new-teammate, new-property-image, new-property-review, new-reservation-message, new-task, new-or-updated-inquiry | apps/hospitable/README.md Triggers section (verified 2026-11-10) | hand | Reservations can be requested newest booked first; inquiries use the last_message_at filter; properties, payouts, teammates, tasks, reviews, images and messages are compared as bounded lists. |
| apps/hostaway | 1 | list-reservations | new-reservation | no | hand | shipped poll trigger(s) over list action list-reservations |
| apps/hotmart | 1 | product-list | new-product | apps/hotmart/README.md Triggers section (verified 2026-11-09) | hand | shape c: product-list documents max_results/page_token/next_page_token and no sort, so the trigger walks the creator's catalogue and snapshots product ids (https://developers.hotmart.com/docs/en/v1/product/product-list/) |
| apps/housecallpro | 14 | customer-list | new-customer, new-employee, new-estimate, new-or-updated-estimate, new-estimate-option-line-item, new-event, new-or-updated-event, new-invoice, new-job-appointment, new-job-invoice, new-job-line-item, new-job, new-or-updated-job, new-lead | apps/housecallpro/README.md Triggers section (verified 2026-11-10) | hand | Poll triggers cover operational records; the listed static or derived lists are intentionally skipped. |
| apps/hubstaff | 1 | project-list | new-project | apps/hubstaff/README.md Triggers section (verified 2026-11-09) | hand | shape c: projects endpoint has page_start_id/page_limit and no sort, so the trigger walks every page (status=all) and snapshots project ids (https://api.hubstaff.com/v2/docs) |
| apps/huggingface | 1 | inference-model-list | new-inference-model | apps/huggingface/README.md Triggers section (verified 2026-11-09) | hand | shape c: router /v1/models is one unordered response of a few hundred provider-deployed models; snapshot on model id (https://huggingface.co/docs/hub/api) |
| apps/hunter | 1 | lead-list | new-lead | apps/hunter/README.md Triggers section (verified 2026-11-09) | hand | Lead list is most recent first and exposes stable IDs. |
| apps/hyros | 2 | leads-list | new-lead, new-sale | apps/hyros/README.md Triggers section (verified 2026-11-09) | hand | leads-list and sales-list take the documented fromDate (only records whose join date is more recent) with an opaque nextPageId cursor: since-filter + id dedupe; no update stamp, so no new-or-updated (https://jsapi.apiary.io/apis/hyros.apib) |
| apps/iclosed | 9 | deal-list | new-deal, new-call, new-or-updated-call, new-contact, new-transaction, new-product, new-or-updated-product, new-event, new-user | apps/iclosed/README.md Triggers section (verified 2026-11-10) | hand | poll triggers over newest-first list actions (orderColumn createdAt/updatedAt desc, sort=desc, latestFirst) plus a whole-collection snapshot for users (https://api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml) |
| apps/inoreader | 1 | stream-contents | new-article | apps/inoreader/README.md Triggers section (verified 2026-11-09) | hand | shape a: stream/contents r defaults to newest first, order=newest sends no r (https://www.inoreader.com/developers/stream-contents) |
| apps/insightly | 8 | contact-get-many | new-contact, new-lead, new-opportunity, new-organisation, new-or-updated-contact, new-or-updated-lead, new-or-updated-opportunity, new-or-updated-organisation | apps/insightly/README.md Triggers section (verified 2026-11-09) | hand | *-get-many on GET /{Object}/Search with the documented optional updated_after_utc (field_name/field_value optional), since-filter + id dedupe, new-or-updated keyed id:DATE_UPDATED_UTC (https://api.na1.insightly.com/v3.1/swagger/docs/v3.1); no live webhook doc found, so none recorded |
| apps/instantly | 1 | email-list | new-email | apps/instantly/README.md Triggers section (verified 2026-08-29) | hand | shipped poll trigger(s) over list action email-list |
| apps/instapaper | 1 | folders-list | new-folder | apps/instapaper/README.md Triggers section (verified 2026-11-09) | hand | folders-list is a small whole-account snapshot (https://www.instapaper.com/api/full); bookmarks-list has no documented order or since filter, so bookmarks are not polled |
| apps/ironclad | 2 | record-list | new-record, new-or-updated-record | apps/ironclad/README.md Triggers section (verified 2026-11-09) | hand | Records support descending agreement-date and last-updated sorts with stable IDs. |
| apps/iterable | 1 | list-campaigns | new-campaign | apps/iterable/README.md Triggers section (verified 2026-10-06) | hand | shipped poll trigger(s) over list action list-campaigns |
| apps/jenkins | 2 | get-job-info | new-build, new-job | apps/jenkins/README.md Triggers section (verified 2026-11-09) | hand | get-job-info exposes the job's builds, sorted by number in the trigger; list-jobs is a whole-root snapshot (https://www.jenkins.io/doc/book/using/remote-access-api/) |
| apps/jibble | 1 | activity-list | new-activity | apps/jibble/README.md Triggers section (verified 2026-11-09) | hand | shape a: Activity has createdAt (OData $metadata), trigger sends $orderby=createdAt desc (https://workspace.prod.jibble.io/v1/$metadata) |
| apps/jobber | 2 | invoice-list | new-invoice, new-or-updated-invoice | apps/jobber/README.md Triggers section (verified 2026-11-09) | hand | invoice-list sorted by CREATED_AT / UPDATED_AT descending (sort keys pinned in the request; Jobber docs host returns 403 to automated fetch, https://developer.getjobber.com/docs/) |
| apps/jobnimbus | 2 | contact-list | new-contact, new-or-updated-contact | apps/jobnimbus/README.md Triggers section (verified 2026-11-09) | hand | contact-list sorted by date_created / date_updated descending (https://documenter.getpostman.com/view/3919598/S11PpG4x) |
| apps/jobtread | 1 | list-jobs | new-job | no | hand | shipped poll trigger(s) over list action list-jobs |
| apps/jumpcloud | 1 | user-list | new-user | apps/jumpcloud/README.md Triggers section (verified 2026-11-09) | hand | user-list (V1 /systemusers) sorted -created; V2 user-group-list dropped, UserGroup schema has no creation field (https://docs.jumpcloud.com/api/2.0/index.yaml) |
| apps/justcall | 1 | contact-list | new-contact | apps/justcall/README.md Triggers section (verified 2026-11-09) | hand | contact-list order=desc by contact id, documented as most-recently-added first (https://developer.justcall.io/reference/contacts_list_v21) |
| apps/kajabi | 18 | contact-list | new-contact, new-customer, new-order, new-order-item, new-purchase, new-or-updated-purchase, new-form-submission, new-contact-note, new-or-updated-contact-note, new-transaction, new-payout, new-offer, new-product, new-course, new-form, new-contact-tag, new-contact-offer, new-offer-product | apps/kajabi/README.md Triggers section (verified 2026-11-10) | hand | Poll triggers cover the record feeds; reference lists (sites, tag names, custom-field definitions) are intentionally skipped. |
| apps/keap | 17 | contact-list | new-contact, new-campaign, new-campaign-sequence, new-company, new-email, new-opportunity, new-or-updated-opportunity, new-or-updated-order, new-or-updated-product, new-or-updated-subscription, new-or-updated-tag, new-or-updated-task, new-order, new-tag, new-tagged-contact, new-task, new-user | apps/keap/README.md Triggers section (verified 2026-11-10) | hand | newest-first poll triggers using each list action's documented order_by (https://crm.infusionsoft.com/app/v3/api-docs/V2) |
| apps/kintone | 1 | comments-list | new-comment | apps/kintone/README.md Triggers section (verified 2026-09-05) | hand | shipped poll trigger(s) over list action comments-list |
| apps/kit | 1 | list-subscribers | new-subscriber | apps/kit/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-subscribers |
| apps/klaviyo | 2 | get-profiles | new-profile, new-or-updated-profile | apps/klaviyo/README.md Triggers section (verified 2026-11-09) | hand | get-profiles sorted -created / -updated, both documented sort fields (https://developers.klaviyo.com/en/reference/get_profiles) |
| apps/klicktipp | 1 | subscriber-changed | contact-changed | apps/klicktipp/README.md Triggers section (verified 2026-11-09) | hand | subscriber-changed is a documented since-filter feed of changed contact ids with cursor paging (https://developers.klicktipp.com/) |
| apps/klipfolio | 2 | dashboard-list | new-dashboard, new-data-source | apps/klipfolio/README.md Triggers section (verified 2026-11-09) | hand | dashboard-list and datasource-list return the whole account collection through limit/offset with a total (https://apidocs.klipfolio.com/) |
| apps/knack | 1 | record-list | new-record | apps/knack/README.md Triggers section (verified 2026-11-09) | hand | record-list sorted descending by a caller-named creation-time field (sort_field / sort_order, https://docs.knack.com/reference/sorting) |
| apps/kommo | 1 | lead-list | new-lead | apps/kommo/README.md Triggers section (verified 2026-09-05) | hand | shipped poll trigger(s) over list action lead-list |
| apps/kudosity | 1 | sms-list | new-sms | no | hand | shipped poll trigger(s) over list action sms-list |
| apps/kustomer | 2 | customer-list | new-customer, new-or-updated-customer | apps/kustomer/README.md Triggers section (verified 2026-11-09) | hand | customer-list sort=-createdAt / -updatedAt (https://developer.kustomer.com/api/core-resources/get-customers) |
| apps/landbot | 1 | channel-list | new-channel | apps/landbot/README.md Triggers section (verified 2026-11-09) | hand | channel-list is the whole workspace channel set through offset/limit with a total; customer-list has no documented order or since filter (https://dev.landbot.io/api-reference/platform/openapi.json) |
| apps/launchdarkly | 2 | flag-list | new-flag, new-audit-log-entry | apps/launchdarkly/README.md Triggers section (verified 2026-11-09) | hand | flag-list sorted -creationDate (documented sort field) and audit-log-list with the documented epoch-ms after filter (https://launchdarkly.com/docs/api/feature-flags/get-feature-flags) |
| apps/lawmatics | 1 | list-contacts | new-contact | apps/lawmatics/README.md Triggers section (verified 2026-11-09) | hand | list-contacts sort_by=created_at&sort_order=desc (https://docs.lawmatics.com/api/collections/26379991/2sA3JM7gbw) |
| apps/leadfeeder | 7 | visitor-company-list | new-visitor-company, new-campaign, new-custom-feed, new-tag, new-list, new-list-item, new-web-visit | apps/leadfeeder/README.md Triggers section (verified 2026-11-10) | hand | visitor-company-list most-recent-visitor-first by documented default (https://api.leadfeeder.com/openapi.yaml); bounded snapshots for campaigns, custom feeds, tags, lists and one list's items; web visits via a since-filter (start_date/end_date) poll on web-visit-search |
| apps/learnworlds | 1 | users-list | new-user | apps/learnworlds/README.md Triggers section (verified 2026-11-09) | hand | users-list returns users newest registered first per the existing action's own documented behaviour; the vendor portal is JavaScript-rendered so the order is not independently re-verified (https://www.learnworlds.dev/) |
| apps/leexi | 1 | meeting-event-list | new-meeting-event | no | hand | shipped poll trigger(s) over list action meeting-event-list |
| apps/lemonsqueezy | 10 | order-list | new-order, new-checkout, new-customer, new-discount, new-license-key, new-price, new-subscription, new-product, new-variant, new-store | apps/lemonsqueezy/README.md Triggers section (verified 2026-11-10) | hand | nine list actions behind poll triggers (documented created_at/id-descending defaults, or a whole-collection snapshot for name/sort-ordered catalogues); https://docs.lemonsqueezy.com/api |
| apps/lever | 2 | posting-list | new-posting, new-or-updated-posting | apps/lever/README.md Triggers section (verified 2026-11-09) | hand | posting-list read as a bounded whole-collection snapshot (cursor pages of 100, max 5000), no sort relied on (https://hire.lever.co/developer/documentation#list-all-postings) |
| apps/lexware-office | 2 | voucher-list | new-voucher, new-or-updated-voucher | apps/lexware-office/README.md Triggers section (verified 2026-11-09) | hand | voucher-list sort=createdDate,DESC / updatedDate,DESC (https://developers.lexware.io/docs/) |
| apps/linkedin/linkedin | 2 | list-posts-by-author | new-post, new-or-updated-post | apps/linkedin/linkedin/README.md Triggers section (verified 2026-11-09) | hand | list-posts-by-author sortBy=CREATED / LAST_MODIFIED (https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api) |
| apps/linkedin/linkedin-ads | 1 | ad-account-list | new-ad-account | apps/linkedin/linkedin-ads/README.md Triggers section (verified 2026-11-09) | hand | ad-account-list read as a bounded whole-collection snapshot via pageToken (https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-accounts) |
| apps/linkedin/linkedin-conversions | 1 | conversion-rule-list | new-conversion-rule | apps/linkedin/linkedin-conversions/README.md Triggers section (verified 2026-11-09) | hand | conversion-rule-list returns every rule of one Ad Account through start/count with paging.total (https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/conversions-api) |
| apps/linkup | 6 | tasks-list | new-task, new-research-task, new-extract-task, new-or-updated-task, new-or-updated-research-task, new-or-updated-extract-task | apps/linkup/README.md Triggers section (verified 2026-11-09) | hand | tasks-list, research-list and extract-list document sortBy=createdAt\|updatedAt and sortDirection=desc; task outputs carry updatedAt, so new-or-updated-* de-duplicate on id:updatedAt (https://api.linkup.so/v1/openapi.json) |
| apps/linkupapi | 7 | account-list | new-candidate, new-connection, new-profile-post, new-account, new-invitation, new-job, new-webhook-event | apps/linkupapi/README.md Triggers section (verified 2026-11-10) | hand | Newest-first polls (accounts, stored connections, profile posts, candidates), bounded snapshots (received invitations, job postings) and the stored webhook-event stream by event_id cursor. Webhook push is queued separately. |
| apps/littlegreenlight | 2 | constituent-search | new-constituent, new-or-updated-constituent | apps/littlegreenlight/README.md Triggers section (verified 2026-11-09) | hand | constituent-search sorted date_created! / date_updated! (vendor sort param, trailing ! reverses), limit 100; updated variant ids id:updated_at (vendor field; date_updated is only the sort key) |
| apps/livechat | 1 | list-archives | new-chat-thread | apps/livechat/README.md Triggers section (verified 2026-11-09) | hand | list-archives with the documented filters.from since-filter and sort_order desc (https://platform.text.com/docs/messaging/agent-chat-api) |
| apps/livestorm | 9 | event-list | new-event, new-or-updated-event, new-session, new-or-updated-session, new-session-registrant, new-or-updated-session-registrant, new-session-question, new-session-recording, new-user | apps/livestorm/README.md Triggers section (verified 2026-11-10) | hand | since-filter polls (filter[created_since]/[updated_since]) over event-list, session-list and session-people-list, plus whole-collection snapshots for questions, recordings and users (https://developers.livestorm.co/reference/get_sessions) |
| apps/lob | 1 | address-list | new-address | apps/lob/README.md Triggers section (verified 2026-11-09) | hand | address-list is documented newest-created first (https://docs.lob.com/#tag/Addresses/operation/addresses_list) |
| apps/lofty | 1 | lead-list | new-lead | apps/lofty/README.md Triggers section (verified 2026-11-09) | hand | lead-list sort=CreateTime desc=true limit 100; id leadId (vendor reference is client-rendered, sort value rests on the action's documented list) |
| apps/loop-returns | 1 | order-list | new-order | no | hand | shipped poll trigger(s) over list action order-list |
| apps/loops | 1 | transactional-list | new-transactional | apps/loops/README.md Triggers section (verified 2026-11-09) | hand | vendor: list transactional emails 'most recently created first' (https://loops.so/docs/api-reference/list-transactional-emails) |
| apps/loyverse | 2 | receipt-list | new-receipt, new-or-updated-receipt | apps/loyverse/README.md Triggers section (verified 2026-11-09) | hand | new-receipt: receipt-list newest first per the action; updated: updated_at_min=cursor-120s following the vendor cursor, ids id:updated_at |
| apps/luma | 1 | calendar-events-list | new-calendar-event | apps/luma/README.md Triggers section (verified 2026-11-09) | hand | sortDirection=desc on the only vendor sort column start_at; ordered by START time, documented limit (https://docs.luma.com/reference/get_v1-calendars-events-list) |
| apps/maileroo | 1 | list-domains | new-domain | no | hand | shipped poll trigger(s) over list action list-domains |
| apps/mailersend | 1 | list-sender-identities | new-sender-identity | apps/mailersend/README.md Triggers section (verified 2026-11-09) | hand | order_by=created_at&order=desc (vendor default asc) per developers.mailersend.com sender-identity page |
| apps/mailjet | 1 | list-messages | new-message | apps/mailjet/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-messages |
| apps/maintainx | 2 | workorder-list | new-work-order, new-or-updated-work-order | apps/maintainx/README.md Triggers section (verified 2026-11-09) | hand | GET /workorders explicit sort=-createdAt / -updatedAt per vendor OpenAPI; user-list dropped (no documented order) |
| apps/manus | 1 | task-list | new-task | apps/manus/README.md Triggers section (verified 2026-11-09) | hand | order=desc is newest first by creation time (https://open.manus.ai/docs/v2/task.list) |
| apps/manychat | 1 | list-flows | new-flow | apps/manychat/README.md Triggers section (verified 2026-11-09) | hand | getFlows returns the Page's whole flow set in one call: pollSnapshot, added only |
| apps/mastodon | 1 | notification-list | new-notification | apps/mastodon/README.md Triggers section (verified 2026-11-09) | hand | notification-list is newest-first and supports forward paging with min_id |
| apps/matrix | 1 | get-messages | new-room-message | apps/matrix/README.md Triggers section (verified 2026-11-09) | hand | get-messages supports backwards (newest-first) room timeline paging; trigger keeps only m.room.message events (https://spec.matrix.org/latest/client-server-api/) |
| apps/mattermost | 1 | posts-for-channel | new-post | apps/mattermost/README.md Triggers section (verified 2026-11-09) | hand | since=cursor-120s ms (vendor: all posts modified since, ordered by create time, <=1000, no paging); read order.map(id=>posts[id]), create_at filter drops edits |
| apps/meilisearch | 1 | task-list | new-task | apps/meilisearch/README.md Triggers section (verified 2026-11-09) | hand | vendor: tasks returned in descending uid order by default (https://www.meilisearch.com/docs/reference/api/tasks/list-tasks); search/document-list/index-list unused |
| apps/meistertask | 12 | checklist-item-list | new-checklist-item, new-project, new-section, new-task, new-or-updated-task, new-comment, new-subtask, new-checklist, new-label, new-project-person, new-person, new-task-label | apps/meistertask/README.md Triggers section (verified 2026-11-10) | hand | sort=-id (vendor: '-' prefix descending, default ascending id) per developers.meistertask.com sorting page; unpaginated lists (labels, persons, task labels) are compared as bounded lists. |
| apps/mem | 2 | task-list | new-task, new-or-updated-task | apps/mem/README.md Triggers section (verified 2026-11-09) | hand | task-list with order_by=created_at and order_by=updated_at (id includes updated_at); both documented in Mem's OpenAPI. |
| apps/memberstack | 1 | member-list | new-member | no | hand | shipped poll trigger(s) over list action member-list |
| apps/mercury | 1 | customer-list | new-customer | apps/mercury/README.md Triggers section (verified 2026-11-09) | hand | Customers requested in descending order. |
| apps/meta/instagram-for-business | 1 | list-media | new-media | apps/meta/instagram-for-business/README.md Triggers section (verified 2026-11-09) | hand | Media edge is documented as most recent first. |
| apps/microsoft/azuredevops | 3 | build-list | new-build, new-work-item, new-or-updated-work-item | apps/microsoft/azuredevops/README.md Triggers section (verified 2026-11-09) | hand | build-list takes a minTime filter (id dedupe, no default-order reliance); work-item-query runs trigger-built WIQL with explicit ORDER BY CreatedDate/ChangedDate DESC (https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax) |
| apps/microsoft/excel | 2 | list-workbooks | new-workbook, new-or-updated-workbook | apps/microsoft/excel/README.md Triggers section (verified 2026-11-09) | hand | list-workbooks with createdDateTime desc and lastModifiedDateTime desc (id includes the stamp). |
| apps/microsoft/microsoft-entra-id | 1 | list-deleted-items | new-deleted-item | apps/microsoft/microsoft-entra-id/README.md Triggers section (verified 2026-11-09) | hand | Deleted items are requested by deletedDateTime descending. |
| apps/microsoft/onedrive | 1 | list-changes | file-changed | no | hand | shipped poll trigger(s) over list action list-changes |
| apps/microsoft/onenote | 1 | list-pages | new-or-updated-page | apps/microsoft/onenote/README.md Triggers section (verified 2026-11-09) | hand | Page feed is documented as last-modified descending; update stamp is part of id. |
| apps/microsoft/outlook | 4 | list-messages | new-email, new-event, new-calendar, new-mail-folder | apps/microsoft/outlook/README.md Triggers section (verified 2026-11-10) | hand | polls over list-messages and list-events (newest first) and list-calendars and list-mail-folders (snapshots); no webhook: Graph subscriptions expire in under 7 days and need renewal (https://learn.microsoft.com/en-us/graph/change-notifications-overview) |
| apps/microsoft/powerbi | 2 | list-refresh-history | new-refresh, new-or-updated-refresh | apps/microsoft/powerbi/README.md Triggers section (verified 2026-11-09) | hand | refresh history is a bounded collection (20-60 entries per dataset) with stable requestId (https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-refresh-history) |
| apps/microsoft/sharepoint | 1 | list-items | new-list-item | no | hand | shipped poll trigger(s) over list action list-items |
| apps/microsoft/teams | 8 | list-channel-messages | new-channel-message, new-team, new-channel, new-team-member, new-channel-member, new-chat, new-chat-message, new-or-updated-chat-message | apps/microsoft/teams/README.md Triggers section (verified 2026-11-10) | hand | polls over list-channel-messages, list-chat-messages (newest first), list-chats and snapshots of list-teams, list-channels and the two member lists; no webhook: Teams subscriptions expire in 3 days and need renewal (https://learn.microsoft.com/en-us/graph/api/resources/subscription) |
| apps/millionverifier | 2 | bulk-list-files | new-bulk-file, new-or-updated-bulk-file | apps/millionverifier/README.md Triggers section (verified 2026-11-09) | hand | bulk-list-files takes createdate_from / updated_at_from since-filters (yyyy-MM-dd HH:mm:ss, written by the trigger itself); id file_id (https://developer.millionverifier.com/) |
| apps/miro | 1 | board-list | new-board | apps/miro/README.md Triggers section (verified 2026-11-09) | hand | board-list sort=last_created with required teamId (Miro honours sort only within a team or project). |
| apps/missive | 10 | conversation-list | new-comment, new-contact-group, new-conversation, new-draft, new-message, new-or-updated-contact, new-or-updated-conversation, new-or-updated-task, new-post, new-task | apps/missive/README.md Triggers section (verified 2026-11-10) | hand | Newest-first conversation and task activity polls (omitting `until`), per-conversation comment/draft/message/post feeds, new-or-updated siblings for conversations/tasks/contacts; remaining administrative lists have no documented safe order or since filter. |
| apps/mixmax | 1 | unsubscribe-list | new-unsubscribe | no | hand | shipped poll trigger(s) over list action unsubscribe-list |
| apps/mixpanel | 1 | cohort-list | new-cohort | apps/mixpanel/README.md Triggers section (verified 2026-11-09) | hand | Saved cohorts are a small bounded collection; pollSnapshot emits a cohort when its id first appears. |
| apps/moco | 1 | contact-list | new-or-updated-contact | apps/moco/README.md Triggers section (verified 2026-11-09) | hand | contact-list updated_after set to cursor minus 2 min overlap, id includes updated_at (shape b). |
| apps/mollie | 9 | chargeback-list | new-chargeback, new-customer, new-customer-payment, new-mandate, new-payment, new-payment-link, new-refund, new-subscription, new-subscription-all | apps/mollie/README.md Triggers section (verified 2026-11-10) | hand | Newest-first polls (sort=desc where documented; payment links and account-wide subscriptions throw if a page is not newest-first by createdAt) for payments, customers, chargebacks, refunds, payment links and account-wide subscriptions; selected-customer feeds for payments, mandates and subscriptions. |
| apps/moneybird | 3 | sales-invoice-list | new-sales-invoice, new-or-updated-sales-invoice, new-contact | apps/moneybird/README.md Triggers section (verified 2026-11-10) | hand | sales-invoice-list polls (created_after/updated_after, round 2 P-batch) plus new-contact as a signed API-registered webhook (contact_created; Moneybird-Signature HMAC-SHA256 over t.body, 5 min window) because contact-list has no filter (https://developer.moneybird.com/webhooks/verifying-signatures) |
| apps/mongodb-atlas | 1 | event-list | new-event | apps/mongodb-atlas/README.md Triggers section (verified 2026-11-09) | hand | event-list minDate set to cursor minus 2 min overlap, deduped by event id (shape b); no sort order is documented. |
| apps/moonclerk | 1 | customer-list | new-customer | apps/moonclerk/README.md Triggers section (verified 2026-11-09) | hand | Customer list has a bounded 100-row page and documented checkout_from creation-date filter; the trigger uses overlap plus ID deduplication |
| apps/mural | 9 | mural-list | new-mural, new-or-updated-mural, new-workspace, new-room, new-room-folder, new-room-member, new-mural-user, new-mural-tag, new-widget | apps/mural/README.md Triggers section (verified 2026-11-10) | hand | new-mural wraps mural-list sortBy=lastCreated; new-or-updated-mural sortBy=lastModified with idOf id:updatedOn; workspaces, rooms, folders, members, mural users, tags and widgets are compared as bounded lists (next-token paging). |
| apps/nationbuilder | 2 | person-list | new-person, new-or-updated-person | apps/nationbuilder/README.md Triggers section (verified 2026-11-09) | hand | wraps person-list with sort=-created_at / -updated_at; the v2 spec documents JSON:API sort but not a default order, so the sort is explicit |
| apps/ninox | 1 | record-list | new-or-updated-record | apps/ninox/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action record-list |
| apps/nocodb | 1 | record-list | new-record | apps/nocodb/README.md Triggers section (verified 2026-11-09) | hand | wraps record-list with sort=-Id (auto-increment primary key; sort documented as column name, - for descending) on a user-chosen table |
| apps/nocrm | 1 | lead-get-many | new-lead | apps/nocrm/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action lead-get-many |
| apps/nutshell | 1 | find-leads | new-lead | apps/nutshell/README.md Triggers section (verified 2026-11-10) | hand | Find Leads takes documented $orderBy/$orderDirection/$limit (https://developers-rpc.nutshell.com/detail/class_core.html); trigger reads one id-descending page of 100 with stable lead IDs |
| apps/odoo | 2 | list-contacts | new-contact, new-or-updated-contact | apps/odoo/README.md Triggers section (verified 2026-11-09) | hand | wraps list-contacts with order=create_date desc / write_date desc (ORM log-access fields) |
| apps/okta | 2 | user-list | new-user, new-or-updated-user | apps/okta/README.md Triggers section (verified 2026-11-10) | hand | user-list passes SCIM search over documented top-level created/lastUpdated (Okta Management OpenAPI listUsers); search is eventually consistent so a 30-minute overlap plus id dedupe is used; group-list exposes only q so groups stay event-hook-only |
| apps/omnisend | 1 | list-contacts | new-contact | apps/omnisend/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-contacts |
| apps/oncehub | 1 | sms-notification-list | new-sms-notification | apps/oncehub/README.md Triggers section (verified 2026-11-09) | hand | OnceHub pagination guide: list requests return objects in reverse chronological order |
| apps/onepagecrm | 1 | list-contacts | new-contact | apps/onepagecrm/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-contacts |
| apps/onesignal | 1 | view-messages | new-message | apps/onesignal/README.md Triggers section (verified 2026-11-10) | hand | view-messages (GET /notifications) is documented 'sorted by queued_at in descending order' (https://documentation.onesignal.com/reference/view-messages); webhook upgrade (delivery/click events) stays queued |
| apps/ontraport | 4 | contact-list | new-contact, new-or-updated-contact, new-purchase, new-or-updated-order | apps/ontraport/README.md Triggers section (verified 2026-11-09) | hand | contact-list sorts by date (Date Added) / dlm (Date Modified) with sortDir=desc (api.ontraport.com/doc/); purchase-list sorts by date, order-list by dlm; task-list not wrapped (sort on date_assigned not documented as accepted); Subscribe-to-a-webhook API recorded in webhooks file. |
| apps/openai | 2 | files-list | new-file, new-model | apps/openai/README.md Triggers section (verified 2026-11-09) | hand | files-list gained additive limit/order inputs; /files documents order=created_at default desc (listFiles in openai-openapi); list-models snapshot (one unpaginated request) emits added models only. |
| apps/otter | 1 | conversation-list | new-conversation | apps/otter/README.md Triggers section (verified 2026-11-09) | hand | conversation-list is documented most recent first (limit 1-20 per the same article); stable conversation ids; request uses limit=20. |
| apps/outreach | 2 | account-list | new-account, new-or-updated-account | apps/outreach/README.md Triggers section (verified 2026-11-09) | hand | wraps account-list with sort=-createdAt / -updatedAt (sort syntax documented; per-attribute sortability not spelled out) |
| apps/outseta | 5 | list-accounts | new-account, new-person, new-deal, new-case, new-invoice | apps/outseta/README.md Triggers section (verified 2026-11-09) | hand | list endpoints take orderBy=PropertyName+DESC and Created__gt (docs.outseta.com/api-reference/overview); triggers sort by Created DESC on accounts, people, deals, cases and invoices; Activity Notifications webhooks recorded in webhooks file. |
| apps/paddle | 1 | customer-list | new-customer | apps/paddle/README.md Triggers section (verified 2026-11-09) | hand | order_by documents only id, default id[DESC] |
| apps/pagerduty | 1 | incident-list | new-incident | apps/pagerduty/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action incident-list |
| apps/pandadoc | 2 | document-get-many | new-document, new-or-updated-document | apps/pandadoc/README.md Triggers section (verified 2026-11-09) | hand | order_by documents -date_created / -date_modified |
| apps/paperform | 2 | list-form-submissions | new-submission, new-form | apps/paperform/README.md Triggers section (verified 2026-11-09) | hand | list-form-submissions and list-forms are documented sorted by created_at, default DESC; form webhook recorded in webhooks file. |
| apps/pardot | 2 | landing-page-list | new-landing-page, new-or-updated-landing-page | apps/pardot/README.md Triggers section (verified 2026-11-09) | hand | new-landing-page orderBy=id DESC; new-or-updated-landing-page since-filter updatedAtAfter (landing-page-list param) with idOf id:updatedAt |
| apps/parseur | 1 | document-list | new-document | apps/parseur/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action document-list |
| apps/particle | 1 | device-list | new-device | apps/particle/README.md Triggers section (verified 2026-11-09) | hand | snapshot diff over GET /v1/devices (unpaged account list sorted by last_handshake_at, not claim time) |
| apps/paystack | 3 | transaction-list | new-transaction, new-customer, new-refund | apps/paystack/README.md Triggers section (verified 2026-11-09) | hand | transaction-list, customer-list and refund-list take documented from/to date filters (since-filter shape, dedupe by id); charge.success webhook upgrade queued. |
| apps/pdfmonkey | 2 | list-documents | new-document, new-or-updated-document | apps/pdfmonkey/README.md Triggers section (verified 2026-11-09) | hand | since-filter: q[updated_since]=cursor-120s with id dedupe (no documented sort order); new-document ignores cards whose created_at is older than the since window; page-2 loss mode disclosed in README |
| apps/pendo | 1 | list-guides | new-guide | apps/pendo/README.md Triggers section (verified 2026-11-09) | hand | GET /api/v1/guide returns the whole hand-authored guide list in one response (snapshot, additions only); list-features/list-pages not wrapped (auto-discovered, no documented cap, can pass the 5000-row snapshot limit); no webhook offering found on developers.pendo.io. |
| apps/pennylane | 1 | list-customer-invoices | new-customer-invoice | apps/pennylane/README.md Triggers section (verified 2026-11-09) | hand | sort documented, default -id; trigger sorts -id explicitly |
| apps/perplexity | 1 | list-models | new-model | apps/perplexity/README.md Triggers section (verified 2026-11-09) | hand | Snapshots the short vendor-wide Agent API model catalog (GET /v1/models, one request) and emits additions only; web-search is an ad-hoc ranked search, not a record feed (https://docs.perplexity.ai/api-reference/models-get) |
| apps/personio | 2 | list-employees | new-employee, new-or-updated-employee | apps/personio/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll: list-employees updatedSince = cursor-10min, id dedupe; new-employee keeps created_at in window (https://github.com/personio/api-docs/blob/HEAD/personio-personnel-data-api-oa3.yaml) |
| apps/perspective | 1 | contact-list | new-contact | apps/perspective/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/phrase | 2 | job-list | new-job, new-or-updated-job | apps/phrase/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll with a declared projectId param: job-list updatedSince = cursor-10min, id dedupe (https://developers.phrase.com/en/api/strings/jobs/list-jobs) |
| apps/pinecone | 2 | index-list | new-index, new-backup | apps/pinecone/README.md Triggers section (verified 2026-11-09) | hand | Bounded snapshots (<=200 indexes, <=1000 backups per project per https://docs.pinecone.io/reference/api/database-limits/object-limits), additions only; namespace-list unbounded, model-list is a vendor catalog, record-list is lexicographic id enumeration |
| apps/placid | 2 | template-list | new-template, new-or-updated-template | apps/placid/README.md Triggers section (verified 2026-11-09) | hand | Polls created and updated template sort orders. |
| apps/plaid | 1 | transaction-sync | new-transaction | apps/plaid/README.md Triggers section (verified 2026-11-10) | hand | transaction-sync (POST /transactions/sync) is a documented cursor change feed (added/modified/removed + next_cursor, https://plaid.com/docs/api/products/transactions/#transactionssync): new-transaction stores the cursor (pollToken) and emits added; institution-list stays unwrapped (catalog with no sort or created filter) |
| apps/planningcenter | 2 | list-event-instances | new-event-instance, new-or-updated-event-instance | apps/planningcenter/README.md Triggers section (verified 2026-11-09) | hand | list-event-instances order=-created_at / -updated_at (orderable per https://api.planningcenteronline.com/calendar/v2/documentation/2022-07-07/vertices/event_instance) |
| apps/plivo | 2 | list-messages | new-message, new-call | apps/plivo/README.md Triggers section (verified 2026-11-09) | hand | list-messages (message_time__gt) and list-calls (end_time__gte) take documented time filters (since-filter shape, dedupe by uuid); signed message/call callbacks recorded in webhooks file. |
| apps/podio | 1 | task-list | new-task | apps/podio/README.md Triggers section (verified 2026-11-09) | hand | Polls tasks sorted by created_on descending. |
| apps/podium | 11 | conversation-list | new-conversation, new-feedback, new-location, new-or-updated-appointment, new-or-updated-call, new-or-updated-campaign, new-or-updated-contact, new-or-updated-review, new-review, new-review-invite, new-user | apps/podium/README.md Triggers section (verified 2026-11-10) | hand | newest-first and updated-since poll triggers over /v4 list actions plus whole-collection snapshots for locations and users |
| apps/postgres | 1 | query | new-row | no | hand | shipped poll trigger(s) over list action query |
| apps/postmark | 1 | list-outbound-messages | new-outbound-message | apps/postmark/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-outbound-messages |
| apps/practicebetter | 9 | list-client-records | new-client-record, new-or-updated-client-record, new-invoice, new-session, new-tag, new-reminder, new-package-instance, new-service, new-package | apps/practicebetter/README.md Triggers section (verified 2026-11-10) | hand | every business list is behind a poll trigger (descending-by-created order documented in https://api-docs.practicebetter.io/swagger.json, or a rank-ordered catalogue snapshot); webhook subscriptions also exist |
| apps/printavo | 1 | task-list | new-task | apps/printavo/README.md Triggers section (verified 2026-11-09) | hand | Polls tasks sorted by CREATED_AT descending. |
| apps/printnode | 1 | printjob-list | new-printjob | apps/printnode/README.md Triggers section (verified 2026-11-09) | hand | GET /printjobs is documented newest first |
| apps/processstreet | 1 | workflow-run-list | new-workflow-run | apps/processstreet/README.md Triggers section (verified 2026-11-09) | hand | Polls the documented newest-created workflow run list. |
| apps/productboard | 12 | note-list | new-entity, new-entity-relationship, new-jira-integration-connection, new-member, new-note, new-note-relationship, new-or-updated-entity, new-or-updated-note, new-or-updated-team, new-plugin-integration-connection, new-team, new-team-member | apps/productboard/README.md Triggers section (verified 2026-11-10) | hand | 12 poll triggers: since-filter notes (createdFrom/updatedFrom) and entities (entity-search filter.createdAt/updatedAt), plus bounded snapshots of teams, members, team members and entity/note relationships and Jira/plugin integration connections (https://developer.productboard.com/openapi/entities.yaml) |
| apps/productive | 2 | deal-list | new-deal, new-booking, new-comment, new-company, new-deal-status, new-invoice, new-page, new-person, new-project, new-task, new-or-updated-booking, new-or-updated-page, new-or-updated-task, new-or-updated-time-entry | apps/productive/README.md Triggers section (verified 2026-11-10) | hand | Poll triggers use a vendor-documented creation/update sort (pages, tasks, time entries) or a documented created_at/updated_at date filter (bookings, people); lists with no creation order or filter are skipped with the OpenAPI premise. |
| apps/pushbullet | 2 | chat-list | new-chat, new-or-updated-chat | apps/pushbullet/README.md Triggers section (verified 2026-11-09) | hand | chat-list is modified-first (docs.pushbullet.com): new-or-updated-chat reads it; new-chat is a snapshot diff, added only |
| apps/pylon | 8 | issue-list | new-account, new-contact, new-issue, new-issue-message, new-issue-thread, new-tag, new-team, new-user | apps/pylon/README.md Triggers section (verified 2026-11-10) | hand | issue-list since-filter plus id-diff snapshots of the account, contact, user, team, tag lists and of one issue's messages and threads |
| apps/qdrant | 1 | collection-list | new-collection | apps/qdrant/README.md Triggers section (verified 2026-11-09) | hand | the complete collection directory is returned in one bounded GET /collections response |
| apps/quaderno | 1 | invoice-list | new-invoice | apps/quaderno/README.md Triggers section (verified 2026-11-09) | hand | invoice-list is documented newest first |
| apps/quickbase | 1 | list-tables | new-table | apps/quickbase/README.md Triggers section (verified 2026-11-09) | hand | poll snapshot: list-tables returns the bounded whole set as one array; added only |
| apps/quickbooks | 2 | customer-list | new-customer, new-or-updated-customer | apps/quickbooks/README.md Triggers section (verified 2026-11-09) | hand | poll: customer-list ORDERBY MetaData.CreateTime / LastUpdatedTime DESC (Intuit page not curl-able; not live-verified) |
| apps/quo | 2 | conversation-list | new-conversation, new-or-updated-conversation | apps/quo/README.md Triggers section (verified 2026-11-09) | hand | GET /v1/conversations takes createdAfter and updatedAfter; call/message webhooks also exist (see webhooks file) |
| apps/raindrop | 2 | raindrop-search | new-bookmark, new-collection | apps/raindrop/README.md Triggers section (verified 2026-11-09) | hand | poll: raindrop-search sort=-created (documented default newest first); new-collection is a snapshot diff of collection-list |
| apps/raisely | 2 | campaign-list | new-campaign, new-or-updated-campaign | apps/raisely/README.md Triggers section (verified 2026-11-09) | hand | poll: campaign-list sort=createdAt\|updatedAt order=desc (documented sort/order params) |
| apps/razorpay | 12 | order-list | new-order, new-payment, new-refund, new-settlement, new-invoice, new-subscription, new-customer, new-dispute, new-item, new-plan, new-payment-link, new-order-payment | apps/razorpay/README.md Triggers section (verified 2026-11-10) | hand | poll since-filter: from=<last check-120s> with skip paging on orders, payments, refunds, settlements, invoices and subscriptions (openapi.json documents from/to/count/skip); customers, disputes, items, plans, payment links and an order's payments have no date filter and are compared as bounded lists. |
| apps/rdstation | 1 | list-contacts | new-contact | apps/rdstation/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-contacts |
| apps/read-ai | 1 | list-meetings | new-meeting | apps/read-ai/README.md Triggers section (verified 2026-11-09) | hand | GET /v1/meetings is newest first and bounded to ten records |
| apps/readwise | 1 | book-list | new-or-updated-book | apps/readwise/README.md Triggers section (verified 2026-11-09) | hand | poll since-filter: book-list updated__gt; no creation filter so no pure new-book |
| apps/recallai | 1 | calendar-list | new-calendar | apps/recallai/README.md Triggers section (verified 2026-11-09) | hand | GET /api/v2/calendars/ takes created_at__gte; bot status webhooks also exist (see webhooks file) |
| apps/recharge | 2 | order-list | new-order, new-or-updated-order | apps/recharge/README.md Triggers section (verified 2026-11-09) | hand | poll since-filter: order-list created_at_min / updated_at_min with cursor paging |
| apps/recruitee | 1 | candidate-list | new-candidate | apps/recruitee/README.md Triggers section (verified 2026-11-09) | hand | poll since-filter: candidate-list created_after (documented); no updated filter |
| apps/recurly | 2 | list-invoices | new-invoice, new-or-updated-invoice | apps/recurly/README.md Triggers section (verified 2026-11-09) | hand | poll: list-invoices sort=created_at\|updated_at order=desc page 1 (OpenAPI list_invoices) |
| apps/reddit | 1 | post-list | new-post | apps/reddit/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action post-list |
| apps/redtail-crm | 1 | contact-search | new-or-updated-contact | apps/redtail-crm/README.md Triggers section (verified 2026-11-09) | hand | GET /contacts/search takes the documented updated_since filter; responses carry meta.total_pages, the action now takes page, and the trigger resumes across checks |
| apps/refiner | 1 | form-list | new-survey | apps/refiner/README.md Triggers section (verified 2026-11-09) | hand | poll snapshot: form-list is a bounded name-ordered set (one page of 1000); contact-list order_by has no documented direction |
| apps/regfox | 2 | form-list | new-form, new-or-updated-form | apps/regfox/README.md Triggers section (verified 2026-11-09) | hand | form-list: new-form sorts sort=desc (id-cursor listing); new-or-updated-form uses the dateUpdatedAfter since-filter with 2-minute overlap and a startingAfter resume (https://docs.webconnex.io/api/v2/) |
| apps/relevanceai | 2 | agent-list | new-agent, new-or-updated-agent | apps/relevanceai/README.md Triggers section (verified 2026-11-09) | hand | agent-list sort [{insert_date_:desc}] / [{update_date_:desc}] per ListAgentsInput.sort (https://api-f1db6c.stack.tryrelevance.com/latest/openapi_schema.json) |
| apps/replicate | 1 | prediction-list | new-prediction | apps/replicate/README.md Triggers section (verified 2026-11-09) | hand | prediction-list is newest-first per the vendor (https://replicate.com/docs/reference/http#predictions.list) |
| apps/replyio | 2 | sequence-contact-list | new-contact, new-sequence-contact | apps/replyio/README.md Triggers section (verified 2026-11-09) | hand | new-sequence-contact: sequence-contact-list sort_by=addingDate desc; new-contact: contact-filter sortBy=addedOn desc (https://docs.reply.io/api-reference/bundled.yaml); contact-list (GET /v3/contacts) has no sort or since filter and is not used |
| apps/resend | 1 | email-list | new-email | apps/resend/README.md Triggers section (verified 2026-11-09) | hand | GET /emails is documented newest first |
| apps/retellai | 2 | list-agents | new-agent, new-or-updated-agent | apps/retellai/README.md Triggers section (verified 2026-11-09) | hand | list-agents sort_order=descending (default); sort field unnamed by the vendor, creation order unproven (https://docs.retellai.com/api-references/list-agents) |
| apps/ringcentral | 2 | call-log-list | new-call-log-record, new-message | apps/ringcentral/README.md Triggers section (verified 2026-11-09) | hand | call-log-list and message-store-list document a dateFrom filter (RingCentral OpenAPI); polled as since-filter with page resume and id dedupe; a webhook (Validation-Token handshake) is also available and queued as an upgrade |
| apps/ringover | 6 | call-list | new-call, new-contact, new-conversation, new-group, new-user, new-tag | apps/ringover/README.md Triggers section (verified 2026-11-10) | hand | call log newest first; contacts, conversations, groups, users and tags as whole-collection snapshots (no created-at order/filter documented, https://developer.ringover.com/web/openapi_public.yml) |
| apps/rippling | 2 | user-list | new-user, new-or-updated-user | apps/rippling/README.md Triggers section (verified 2026-11-09) | hand | user-list order_by created_at desc / updated_at desc (https://developer.rippling.com/documentation/rest-api/reference/list-users) |
| apps/rocketchat | 2 | list-users | new-user, new-or-updated-user | apps/rocketchat/README.md Triggers section (verified 2026-11-09) | hand | list-users sort {createdAt:-1} / {_updatedAt:-1} (https://developer.rocket.chat/apidocs/get-users-list) |
| apps/rootly | 13 | incident-list | new-alert, new-environment, new-functionality, new-incident, new-incident-action-item, new-incident-event, new-or-updated-alert, new-or-updated-user, new-schedule, new-service, new-severity, new-team, new-user | apps/rootly/README.md Triggers section (verified 2026-11-10) | hand | newest-first sort=-created_at on incidents, services, teams, users, functionalities, environments, severities; created/updated since-filter on alerts; id-diff snapshots of schedules and one incident's events and action items |
| apps/salesforce | 2 | query | new-record, new-or-updated-record | apps/salesforce/README.md Triggers section (verified 2026-11-10) | hand | poll over query (SOQL ORDER BY CreatedDate / LastModifiedDate DESC, any object); no webhook: Salesforce streams record changes (Change Data Capture) only to CometD and Pub/Sub API subscribers, not to a callback URL |
| apps/salesloft | 1 | person-list | new-person | apps/salesloft/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action person-list |
| apps/salesmate | 2 | contact-search | new-contact, new-or-updated-contact | apps/salesmate/README.md Triggers section (verified 2026-11-09) | hand | contact search supports documented createdAt and lastModifiedAt descending sort (the contact.-prefixed field names are unverified without a live request) |
| apps/salesmsg | 1 | contact-list | new-contact | apps/salesmsg/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/salla | 2 | order-list | new-order, new-or-updated-order | apps/salla/README.md Triggers section (verified 2026-11-09) | hand | order-list sort_by=created_at-desc / updated_at-desc (https://docs.salla.dev/orders/list.md) |
| apps/samcart | 8 | order-list | new-order, new-charge, new-failed-charge, new-customer, new-product, new-subscription, subscription-status-changed, new-refund | apps/samcart/README.md Triggers section (verified 2026-11-10) | hand | created_at_min since-filter polls (overlap, offset resume, seed floor) on order/charge/failed-charge/customer/product/subscription/subscription-history lists; refund-list id-cursor poll (https://developer.samcart.com/specs/openapi.yaml) |
| apps/scoreapp | 1 | result-list | new-result | apps/scoreapp/README.md Triggers section (verified 2026-11-09) | hand | result-list order_by=created_at order_dir=desc (https://support.scoreapp.com/article/217-scoreapp-public-api-getting-started) |
| apps/seamlessai | 11 | task-list | new-task, new-contact, new-company, new-saved-search, new-campaign, new-campaign-contact, new-activity, new-or-updated-activity, new-list, new-or-updated-list, new-template | apps/seamlessai/README.md Triggers section (verified 2026-11-10) | hand | Eleven poll triggers: newest-first (task, saved search, campaign, activity: documented order), since-filter (contacts, companies: startDate/endDate), snapshots (lists, templates, campaign contacts). |
| apps/seatable | 1 | row-list | new-row | apps/seatable/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action row-list |
| apps/sellsy | 2 | company-search | new-company, new-or-updated-company | apps/sellsy/README.md Triggers section (verified 2026-11-09) | hand | company search supports created_at and updated_at descending sort |
| apps/sendblue | 1 | message-list | new-message | apps/sendblue/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action message-list |
| apps/sender | 2 | subscriber-list | new-subscriber, new-or-updated-subscriber | apps/sender/README.md Triggers section (verified 2026-11-09) | hand | subscriber-list order=created / modified direction=desc (https://api.sender.net/pagination/); key names unproven |
| apps/sendfox | 1 | contact-list | new-contact | apps/sendfox/README.md Triggers section (verified 2026-11-09) | hand | contact-list filter[created_after] since-filter with overlap and page resume (https://sendfox.com/openapi.yaml) |
| apps/sendpulse | 2 | pipelines-list | new-pipeline, new-mailing-list | apps/sendpulse/README.md Triggers section (verified 2026-11-09) | hand | snapshot triggers on pipelines-list (unpaged, tariff-bounded) and mailing-lists-list (https://api.sendpulse.com/.well-known/openapi/crm.yaml); deals-list and campaigns-list do not fit |
| apps/sentry | 1 | issue-list | new-issue | apps/sentry/README.md Triggers section (verified 2026-11-09) | hand | issue-list sort=new (https://docs.sentry.io/api/events/list-an-organizations-issues/) |
| apps/servicem8 | 2 | category-list | new-category, new-or-updated-category | apps/servicem8/README.md Triggers section (verified 2026-11-09) | hand | snapshot (c) of the bounded Job Categories list (one GET /category.json?cursor=-1, <=1000 per response); no created_at field is documented |
| apps/servicenow | 2 | table-record-get-many | new-table-record, new-or-updated-table-record | apps/servicenow/README.md Triggers section (verified 2026-11-09) | hand | Table API sys_created_on/sys_updated_on >= encoded query with ORDERBY and sysparm_offset paging, polled as a since-filter with offset resume and floor (vendor page is a JavaScript shell: ORDERBY syntax unverified) |
| apps/servicetitan | 2 | customer-list | new-customer, new-or-updated-customer | apps/servicetitan/README.md Triggers section (verified 2026-11-09) | hand | customer-list createdOnOrAfter/modifiedOnOrAfter, polled as a since-filter with page resume and floor (vendor page is a JavaScript shell: filters unverified on 2026-11-09) |
| apps/seven | 1 | contact-list | new-contact | apps/seven/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/sharetribe | 1 | event-list | new-event | apps/sharetribe/README.md Triggers section (verified 2026-11-09) | hand | sequence-id token: first check records createdAtStart, then startAfterSequenceId=last event (vendor log is ascending from the earliest event) |
| apps/shippo | 1 | shipment-list | new-shipment | apps/shippo/README.md Triggers section (verified 2026-11-09) | hand | shipment-list takes object_created_gte (documented, https://docs.goshippo.com/api-reference/shipments/list-all-shipments); no documented list order and no updated-since filter, so only new-shipment ships (since-filter with page resume and floor) |
| apps/shipstation | 2 | shipment-list | new-shipment, new-or-updated-shipment | apps/shipstation/README.md Triggers section (verified 2026-11-09) | hand | GET /v2/shipments with documented sort_by=created_at\|modified_at&sort_dir=desc (additive sortBy/sortDir action params) |
| apps/short-io | 1 | link-list | new-link | apps/short-io/README.md Triggers section (verified 2026-11-09) | hand | GET /api/links with documented dateSortOrder=desc; links carry no update stamp |
| apps/shortcut | 12 | story-search | new-epic, new-epic-comment, new-epic-story, new-iteration, new-iteration-story, new-label, new-label-story, new-member, new-or-updated-story, new-project, new-story, new-story-comment | apps/shortcut/README.md Triggers section (verified 2026-11-10) | hand | story-search since-filter (created_at_start/updated_at_start) plus id-diff snapshots of epics, iterations, labels, members, projects, comments and the stories of an epic, iteration or label |
| apps/signrequest | 1 | document-search | new-document | apps/signrequest/README.md Triggers section (verified 2026-11-09) | hand | documents-search is documented ordered by created, newest first, when q/autocomplete/name are not used (OpenAPI); document-list documents no order so it is not used |
| apps/simplero | 2 | contact-list | new-contact, new-or-updated-contact | apps/simplero/README.md Triggers section (verified 2026-11-09) | hand | GET /api/v2/customers documents created_at/updated_at DateFilter (custom from/to dates); date-window poll with after-cursor resume (https://simplero.com/api/v2/docs/openapi.json) |
| apps/simpletexting | 2 | contact-list | new-contact, new-or-updated-contact | apps/simpletexting/README.md Triggers section (verified 2026-11-09) | hand | since-filter window on GET /api/contacts (vendor sorts/filters by updated, no created filter): new-contact keeps created in window; resumes by page |
| apps/simplybook | 1 | booking-get-many | new-booking | apps/simplybook/README.md Triggers section (verified 2026-11-10) | hand | GET /admin/bookings documents filter[record_date_from\|to] (YYYY-MM-DD, company time zone, read from GET /admin/company/info) and every booking carries record_date; the booking has no edit stamp, so filter[edited_date_from] cannot back a new-or-updated trigger: since-filter poll widened one day and filtered by record_date (https://simplybook.me/api/swagger-admin) |
| apps/skyvern | 1 | run-list | new-run | apps/skyvern/README.md Triggers section (verified 2026-11-09) | hand | run-list is documented newest-first: OpenAPI GET /v1/runs says "List the organization's task and agent runs, newest first" (https://api.skyvern.com/openapi.json) |
| apps/slite | 1 | note-list | new-or-updated-note | apps/slite/README.md Triggers section (verified 2026-11-09) | hand | GET /v1/notes?orderBy=lastEditedAt_DESC (documented enum); no created-time order is documented so no new-note |
| apps/smartsheet | 2 | list-sheets | new-sheet, new-or-updated-sheet | apps/smartsheet/README.md Triggers section (verified 2026-11-09) | hand | since-filter window on GET /sheets (documented modifiedSince, no sort): new-sheet keeps createdAt in window; resumes by page; list-container-children/reports/workspaces/users considered and not shipped |
| apps/smartsuite | 2 | list-records | new-record, new-or-updated-record | apps/smartsuite/README.md Triggers section (verified 2026-11-09) | hand | POST records/list sorted by system field first_created / last_updated desc (documented sort syntax and sortable First Created / Last Updated fields) |
| apps/snyk | 2 | issue-list | new-issue, new-or-updated-issue | apps/snyk/README.md Triggers section (verified 2026-11-09) | hand | since-filter window on GET /rest/orgs/{org_id}/issues (documented created_after / updated_after, no sort); action returnAll drains the window |
| apps/softr | 1 | database-list | new-database | apps/softr/README.md Triggers section (verified 2026-11-09) | hand | GET /databases takes no parameters and returns every database in one request: snapshot poll for new databases; record-list has no sort/filter and record-search sorts only by a table-specific field id (https://docs.softr.io/softr-api/softr-database-api/databases/get-databases) |
| apps/solapi | 2 | list-messages | new-message, new-or-updated-message | apps/solapi/README.md Triggers section (verified 2026-11-09) | hand | list-messages takes startDate/endDate with dateType CREATED\|UPDATED and a startKey/nextKey cursor (limit up to 500, ours 100): since-filter poll with resume and seed floor (https://developers.solapi.com/references/messages/list-messages) |
| apps/splitwise | 2 | list-expenses | new-expense, new-or-updated-expense | apps/splitwise/README.md Triggers section (verified 2026-11-09) | hand | since-filter window on GET /get_expenses (documented updated_after, no sort or created filter): new-expense keeps created_at in window; resumes by offset |
| apps/spotify | 1 | playlist-get-user-playlists | new-playlist | apps/spotify/README.md Triggers section (verified 2026-11-09) | hand | snapshot (c) of the user's playlist library (limit=50 pages, refused above 500); search is a query-dependent catalog endpoint |
| apps/square | 1 | customer-get-many | new-customer | apps/square/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action customer-get-many |
| apps/squarespace-commerce | 2 | list-orders | new-order, new-or-updated-order | apps/squarespace-commerce/README.md Triggers section (verified 2026-11-09) | hand | since-filter window on GET /1.0/commerce/orders (documented modifiedAfter+modifiedBefore, ordered by modifiedOn, direction not stated); new-order keeps createdOn in window; resumes by nextPageCursor |
| apps/stackexchange | 11 | question-list | new-answer, new-or-updated-answer, new-comment, new-or-updated-associated-account, new-question, new-or-updated-question, new-user, new-or-updated-user, new-tag-synonym, new-or-updated-user-badge, new-user-reputation-change | apps/stackexchange/README.md Triggers section (verified 2026-11-10) | hand | Newest-first question, comment, user and tag-synonym feeds; fromdate-filtered reputation changes; bounded snapshots for associated accounts and a user's badges; documented creation/activity/modified sorts (https://api.stackexchange.com/docs). |
| apps/statuspage | 1 | subscriber-list | new-subscriber | apps/statuspage/README.md Triggers section (verified 2026-11-10) | hand | subscriber-list with the new newestFirst option sends the documented sort_field=created_at, sort_direction=desc, zero-based page + limit (https://developer.statuspage.io/#operation/getPagesPageIdSubscribers); incident-list and component-list document no sort order or created-since filter |
| apps/storyblok | 1 | story-list | new-story | apps/storyblok/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action story-list |
| apps/strapi | 1 | entry-list | new-entry | apps/strapi/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action entry-list |
| apps/streak | 2 | box-list | new-box, new-or-updated-box | apps/streak/README.md Triggers section (verified 2026-11-09) | hand | sortBy=creationTimestamp \| lastUpdatedTimestamp, 'Both are in descending order' (https://streak.readme.io/reference/list-all-boxes-in-pipeline) |
| apps/supabase | 1 | rows-list | new-row | apps/supabase/README.md Triggers section (verified 2026-11-09) | hand | explicit PostgREST order=<creation column>.desc.nullslast,id.desc on the caller's named table and creation column (https://docs.postgrest.org/en/stable/references/api/tables_views.html) |
| apps/superchat | 11 | contact-list | new-contact, new-channel, new-contact-list, new-contact-list-membership, new-conversation, new-conversation-message, new-file, new-inbox, new-template-folder, new-template, new-workspace-user | apps/superchat/README.md Triggers section (verified 2026-11-10) | hand | Contacts, channels and files are newest-first (documented sort) and polled through their list actions; every other Superchat list documents no sort order and is read whole (cursor-paged, 5000 rows) and snapshot-diffed. |
| apps/synthflow | 1 | call-list | new-call | apps/synthflow/README.md Triggers section (verified 2026-11-09) | hand | since-filter from_date (ms) + limit/offset, no documented sort: window resumed across pages, floor at seed (https://docs.synthflow.ai/api-reference/platform-api/calls/list-calls) |
| apps/systemeio | 9 | contact-list | new-contact, new-campaign, new-community, new-course, new-enrollment, new-funnel, new-membership, new-newsletter, new-tag | apps/systemeio/README.md Triggers section (verified 2026-11-10) | hand | every collection takes order=desc with id cursors, so each new-<record> trigger polls newest first (https://developer.systeme.io/reference/api) |
| apps/tableau | 2 | workbook-list | new-workbook, new-or-updated-workbook | apps/tableau/README.md Triggers section (verified 2026-11-09) | hand | sort=createdAt:desc / updatedAt:desc, 'You can sort on the same fields that you use to filter' and Workbooks filter on createdAt/updatedAt (https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_filtering_and_sorting.htm); users list has no creation stamp |
| apps/tailscale | 1 | user-list | new-user | apps/tailscale/README.md Triggers section (verified 2026-11-09) | hand | bounded snapshot: 'The Tailscale API does not currently support pagination. All results are returned at once.' (https://tailscale.com/api) |
| apps/tally | 1 | submission-get-many | new-submission | apps/tally/README.md Triggers section (verified 2026-11-09) | hand | since-filter startDate + page/limit, no documented sort: window resumed across pages, floor at seed (https://developers.tally.so/api-reference/endpoint/forms/submissions/list) |
| apps/tapfiliate | 9 | conversion-list | new-conversion, new-customer, new-click, new-program, new-affiliate-group, new-affiliate-payment, new-affiliate-program, new-program-affiliate, new-affiliate | apps/tapfiliate/README.md Triggers section (verified 2026-11-10) | hand | conversion-list, customer-list and click-list take day-granular date_from/date_to with no sort (since-filter polls filtered by created_at); programs, affiliates, affiliate groups, one program's affiliates and one affiliate's payments/programs have no usable order or date filter and are read in full and diffed (snapshot); webhook triggers (dashboard-set, unsigned) are queued (https://developers.tapfiliate.com/automation/webhooks) |
| apps/teachable | 1 | transaction-list | new-transaction | apps/teachable/README.md Triggers section (verified 2026-11-09) | hand | since-filter start (exclusive) + page/per, no documented sort: window resumed across pages, floor at seed; user-list has no sort/filter (https://docs.teachable.com/reference/listtransactions) |
| apps/teamleader | 2 | contacts-list | new-contact, new-or-updated-contact | apps/teamleader/README.md Triggers section (verified 2026-11-09) | hand | since-filter (b): contacts-list updatedSince; floor/resume per brief 9.8/9.9 |
| apps/teamup | 7 | invoices-list | new-course, new-instructor, new-invoice, new-membership-plan, new-offering-type, new-staff-member, new-venue | apps/teamup/README.md Triggers section (verified 2026-11-10) | hand | newest-first invoices-list sort=-id plus bounded snapshots of venues, instructors, staff, courses, membership plans and offering types (https://docs.goteamup.com/llms.txt) |
| apps/teamwork | 1 | project-list | new-project | apps/teamwork/README.md Triggers section (verified 2026-11-09) | hand | newest-first (a): project-list orderBy=datecreated&orderMode=desc |
| apps/telnyx | 1 | list-phone-numbers | new-phone-number | apps/telnyx/README.md Triggers section (verified 2026-11-09) | hand | GET /phone_numbers documents its default order: "If not given, results are sorted by created_at in descending order" (https://github.com/team-telnyx/openapi, spec3.json); signed message/call webhooks are also offered and queued (https://developers.telnyx.com/docs/v2/development/api-fundamentals/webhooks) |
| apps/textmagic | 1 | contact-list | new-contact | apps/textmagic/README.md Triggers section (verified 2026-11-09) | hand | newest-first (a): contact-list orderBy=id&direction=desc |
| apps/thinkific | 2 | enrollments-list | new-enrollment, new-or-updated-enrollment | apps/thinkific/README.md Triggers section (verified 2026-11-09) | hand | enrollments-list documents query[created_after\|created_before] and query[updated_after\|updated_before] date-time filters (no sort order) and the response carries updated_at: since-filter polls (https://developers.thinkific.com/openapi/thinkific-admin-api-v1.yaml) |
| apps/ticktick | 1 | list-habits | new-habit | apps/ticktick/README.md Triggers section (verified 2026-11-09) | hand | snapshot (c): list-habits returns the whole small unpaged habit collection; added only; emits the flat habit |
| apps/timelinesai | 1 | messages-list | new-message | apps/timelinesai/README.md Triggers section (verified 2026-11-09) | hand | newest-first (a): messages-list sorting_order=desc, per chat |
| apps/tremendous | 1 | order-list | new-order | apps/tremendous/README.md Triggers section (verified 2026-11-09) | hand | since-filter (b): order-list createdAtGte (created_at[gte]); floor/resume per brief 9.8/9.9 |
| apps/trustpilot | 1 | business-unit-reviews-list | new-review | apps/trustpilot/README.md Triggers section (verified 2026-11-09) | hand | newest-first (a): orderBy=createdat.desc, per business unit |
| apps/tumblr | 1 | blog-posts-list | new-post | apps/tumblr/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action blog-posts-list |
| apps/twilio/sendgrid | 1 | list-get-all | new-list | apps/twilio/sendgrid/README.md Triggers section (verified 2026-11-09) | hand | list-get-all snapshot-diffed (page_size max 1000); contact triggers dropped: contacts/search returns at most 50 rows, no page token or sort (https://www.twilio.com/docs/sendgrid/api-reference/contacts/search-contacts); Event Webhook upgrade queued |
| apps/twist | 11 | message-list | new-message, new-comment, new-thread, new-or-updated-thread, new-conversation, new-or-updated-conversation, new-or-updated-inbox-thread, new-channel, new-group, new-workspace, new-workspace-user | apps/twist/README.md Triggers section (verified 2026-11-10) | hand | poll triggers cover Twist's record feeds: id-ordered new thread/conversation, activity-ordered new-or-updated siblings, and snapshots of the unordered whole collections |
| apps/twitch | 1 | get-channel-followers | new-follower | apps/twitch/README.md Triggers section (verified 2026-11-09) | hand | newest-first (a): get-channel-followers lists most recent follower first (https://dev.twitch.tv/docs/api/reference/#get-channel-followers); needs moderator:read:followers |
| apps/twitter | 1 | tweet-search-recent | new-tweet | apps/twitter/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action tweet-search-recent |
| apps/typefully | 1 | draft-list | new-draft | apps/typefully/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action draft-list |
| apps/typesense | 1 | document-search | new-document | apps/typesense/README.md Triggers section (verified 2026-11-09) | hand | newest-first (a) by user-supplied sortBy (sort_by documented, https://typesense.org/docs/28.0/api/search.html); q=*, strict |
| apps/unbounce | 1 | page-lead-list | new-lead | apps/unbounce/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action page-lead-list |
| apps/upsales | 17 | contact-list | new-contact, new-activity, new-appointment, new-campaign, new-comment, new-company, new-order, new-product, new-subscription, new-ticket, new-user, new-or-updated-activity, new-or-updated-appointment, new-or-updated-company, new-or-updated-contact, new-or-updated-order, new-or-updated-subscription | apps/upsales/README.md Triggers section (verified 2026-11-10) | hand | Id-crawl poll triggers use sort=id with id=gt:<last id>, a seed floor plus the newest id at seed, overlap state, and resume position; new-or-updated-* use modDate=gte:<window> with id paging (https://api.upsales.com). |
| apps/uptimerobot | 2 | monitor-list | new-monitor, new-alert-contact | apps/uptimerobot/README.md Triggers section (verified 2026-11-09) | hand | getMonitors/getAlertContacts document offset/limit (max 50) but no order or since filter: plan-limited collections read in full and snapshot-diffed; web-hook alert contact upgrade queued (https://uptimerobot.com/api/legacy/) |
| apps/uscreen | 3 | customer-list | new-customer, new-invoice, new-or-updated-invoice | apps/uscreen/README.md Triggers section (verified 2026-11-09) | hand | /customers and /invoices document from (RFC 3339) + date_field but no sort: since-filter with page resume and id dedupe; Invoice.updated_at exists so new-or-updated-invoice (date_field=updated_at); Customer has no updated_at (https://uscreen.io/api/publisher.yml) |
| apps/vanta | 15 | issue-list | new-issue, new-control, new-document, new-framework, new-integration, new-monitored-computer, new-person, new-policy, new-risk-scenario, new-test, new-test-entity, new-user, new-vendor, new-vulnerability, new-vulnerability-remediation | apps/vanta/README.md Triggers section (verified 2026-11-10) | hand | 15 poll triggers: issue-list newest-first; vulnerability-list and vulnerability-remediation-list via their since-filters (slaDeadlineAfterDate, remediatedAfterDate); every other list has no sort order or created-since filter in the vendor spec and is snapshot-diffed; Vanta webhooks (questionnaire, vendor decision, trust-center events; dashboard-registered, Svix-signed) are queued for a webhook node and cover none of these record feeds |
| apps/vapi | 1 | phone-number-list | new-phone-number | apps/vapi/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action phone-number-list |
| apps/vbout | 1 | list-list | new-list | apps/vbout/README.md Triggers section (verified 2026-11-09) | hand | getlists takes no paging params and returns every list in one response: snapshot-diffed; getcontacts is per list and campaigns has no documented order (https://developers.vbout.com/scripts/openapi.json) |
| apps/vercel | 1 | deployment-list | new-deployment | apps/vercel/README.md Triggers section (verified 2026-11-09) | hand | Documented since-filter poll trigger on deployment-list (since + until paging), resume position + seed floor. |
| apps/videoask | 1 | conversation-list | new-conversation | apps/videoask/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action conversation-list |
| apps/vimeo | 1 | video-list | new-video | apps/vimeo/README.md Triggers section (verified 2026-11-09) | hand | Newest-first video-list poll trigger. |
| apps/wakatime | 1 | project-list | new-project | apps/wakatime/README.md Triggers section (verified 2026-11-09) | hand | projects endpoint lists the user's projects with no paging or order documented: snapshot-diffed; commit-list is per project with no documented order; no webhooks (https://wakatime.com/developers) |
| apps/wappalyzer | 1 | lists-list | new-lead-list | apps/wappalyzer/README.md Triggers section (verified 2026-11-09) | hand | GET /v2/lists/ returns the account's lead lists unpaginated: snapshot-diffed (https://www.wappalyzer.com/openapi/v2-public.yaml) |
| apps/wati | 1 | templates-list | new-template | apps/wati/README.md Triggers section (verified 2026-11-09) | hand | messageTemplates documents page_number/page_size (max 100) and total, no order: bounded template collection snapshot-diffed; contacts-list is unbounded with no order or filter; webhook upgrade queued (https://docs.wati.io/reference/messagetemplate_getmessagetemplates.md) |
| apps/wave | 2 | customer-list | new-customer, new-or-updated-customer | apps/wave/README.md Triggers section (verified 2026-11-09) | hand | Created and modified customer ordering. |
| apps/wealthbox | 2 | list-contacts | new-contact, new-or-updated-contact | apps/wealthbox/README.md Triggers section (verified 2026-11-09) | hand | Since-filter (updated_since) poll triggers for new and new-or-updated contacts, resume position + seed floor. |
| apps/webinargeek | 1 | message-list | new-message | apps/webinargeek/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action message-list |
| apps/webinarjam | 1 | webinar-list | new-webinar | apps/webinarjam/README.md Triggers section (verified 2026-11-09) | hand | POST /webinars returns a full list of all account webinars in one response: snapshot-diffed (https://support.webinarjam.com/en/collections/19655423-developer-api) |
| apps/whatconverts | 1 | leads-list | new-lead | apps/whatconverts/README.md Triggers section (verified 2026-11-09) | hand | Descending leads list poll trigger. |
| apps/whop | 1 | membership-list | new-membership | apps/whop/README.md Triggers section (verified 2026-11-09) | hand | Created-at descending membership list. |
| apps/wistia | 1 | media-list | new-media | apps/wistia/README.md Triggers section (verified 2026-11-09) | hand | Created descending media list. |
| apps/wix | 1 | list-contacts | new-contact | apps/wix/README.md Triggers section (verified 2026-11-09) | hand | CreatedDate descending contact list. |
| apps/wordpress | 1 | post-get-all | new-post | apps/wordpress/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action post-get-all |
| apps/workable | 1 | candidate-list | new-candidate | apps/workable/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action candidate-list |
| apps/workflowy | 1 | node-list | new-node | apps/workflowy/README.md Triggers section (verified 2026-11-09) | hand | GET /nodes?parent_id= is unpaginated and returns every child of a parent unordered: snapshot-diffed; no webhooks (https://workflowy.com/api-reference/) |
| apps/workos | 1 | event-list | new-event | apps/workos/README.md Triggers section (verified 2026-11-09) | hand | Oldest-first event feed read with after/range_start: persisted last-event-id resume position + seed floor. |
| apps/wrike | 1 | task-list | new-task | apps/wrike/README.md Triggers section (verified 2026-11-09) | hand | Created-date descending task search (sortOrder Desc, the documented casing). |
| apps/wufoo | 1 | entry-list | new-entry | apps/wufoo/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action entry-list |
| apps/xai | 1 | list-files | new-file | apps/xai/README.md Triggers section (verified 2026-11-09) | hand | Created-at descending file list. |
| apps/xero | 1 | contact-list | new-or-updated-contact | apps/xero/README.md Triggers section (verified 2026-11-09) | hand | contact-list accepts order=UpdatedDateUTC DESC (Contact has no created stamp); new-or-updated-contact covers new contacts |
| apps/yelp-leads | 1 | get-lead-ids-for-business | new-lead | apps/yelp-leads/README.md Triggers section (verified 2026-11-09) | hand | lead_ids documents created_after (inclusive) with after_lead_id paging inside the window: since-filter clamped to the seed time, resumable, deduped by id; Ed25519-signed Leads webhook upgrade queued (https://docs.developer.yelp.com/reference/get-lead-ids-for-business) |
| apps/youcanbookme | 1 | list-profiles | new-booking-page | apps/youcanbookme/README.md Triggers section (verified 2026-11-09) | hand | GET /{accountId}/profiles returns every booking page unpaginated: snapshot-diffed; list-bookings is cursor-paged by start time with no created order or filter (https://web.archive.org/web/20210814150430id_/https://api.youcanbook.me/v1/api-docs?group=api) |
| apps/youform | 1 | submission-list | new-submission | apps/youform/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action submission-list |
| apps/zendesk/zendesk-sell | 2 | contact-list | new-contact, new-or-updated-contact | apps/zendesk/zendesk-sell/README.md Triggers section (verified 2026-11-09) | hand | sort_by=created_at:desc / updated_at:desc documented on the contacts list |
| apps/zeplin | 1 | list-screens | new-screen | apps/zeplin/README.md Triggers section (verified 2026-11-09) | hand | screens documents limit/offset and sort=created without a direction, so no order is assumed: project screens read in full and snapshot-diffed; webhook upgrade queued (https://docs.zeplin.dev/reference/getprojectscreens.md) |
| apps/zoho/bigin | 2 | contact-list | new-contact, new-or-updated-contact | apps/zoho/bigin/README.md Triggers section (verified 2026-11-09) | hand | sort_by Created_Time/Modified_Time with sort_order=desc documented on get-records |
| apps/zoho/zoho | 2 | contact-list | new-contact, new-or-updated-contact | apps/zoho/zoho/README.md Triggers section (verified 2026-11-09) | hand | sort_by id/Created_Time/Modified_Time with sort_order=desc documented on get-records |
| apps/zoho/zoho-analytics | 1 | workspace-list-owned | new-workspace | apps/zoho/zoho-analytics/README.md Triggers section (verified 2026-11-09) | hand | owned workspaces are an unpaginated bounded collection; additions are snapshotted (https://www.zoho.com/analytics/api/v2/metadata-api/owned-workspace.html) |
| apps/zoho/zoho-bookings | 1 | workspace-list | new-workspace | apps/zoho/zoho-bookings/README.md Triggers section (verified 2026-11-09) | hand | workspace-list returns the bounded account workspace collection; additions are snapshotted (https://www.zoho.com/bookings/help/api/v1/fetch-workspaces.html) |
| apps/zoho/zoho-calendar | 1 | calendar-list | new-calendar | apps/zoho/zoho-calendar/README.md Triggers section (verified 2026-11-09) | hand | calendar-list is an unpaginated account collection (category defaults to all); additions are snapshotted (https://www.zoho.com/calendar/help/api/get-calendar-list.html) |
| apps/zoho/zoho-campaigns | 1 | campaign-list-recent | new-campaign | apps/zoho/zoho-campaigns/README.md Triggers section (verified 2026-11-09) | hand | recentcampaigns lists the most recently created campaigns (bounded page of 20, id-deduped by campaign_key) |
| apps/zoho/zoho-cliq | 1 | chat-list | new-chat | apps/zoho/zoho-cliq/README.md Triggers section (verified 2026-11-09) | hand | chat-list has modified_after/modified_before filters: since-filter poll with seed floor and resumable drain |
| apps/zoho/zoho-creator | 1 | application-list | new-application | apps/zoho/zoho-creator/README.md Triggers section (verified 2026-11-09) | hand | applications metadata is an unpaginated bounded collection; additions are snapshotted (https://www.zoho.com/creator/help/api/v2/get-applications.html) |
| apps/zoho/zoho-inventory | 2 | item-list | new-item, new-or-updated-item | apps/zoho/zoho-inventory/README.md Triggers section (verified 2026-11-09) | hand | item-list gained optional sort_column/sort_order; items doc documents sort_column created_time/last_modified_time and sort_order D (https://www.zoho.com/inventory/api/v1/items/); contact-list documents no sort direction and salesorder-list only page/per_page, so they stay without triggers |
| apps/zoho/zoho-invoice | 2 | contact-list | new-contact, new-or-updated-contact | apps/zoho/zoho-invoice/README.md Triggers section (verified 2026-11-09) | hand | contact-list documents sort_column created_time and last_modified_time but no default direction, so the trigger reads page 1, infers the direction from the items' own timestamps and, unless newest-first, also reads the last two pages (found via has_more_page); ids de-duplicated, new-or-updated idOf contact_id:last_modified_time (https://www.zoho.com/invoice/api/v3/contacts/) |
| apps/zoho/zoho-people | 1 | record-list | new-or-updated-record | apps/zoho/zoho-people/README.md Triggers section (verified 2026-11-09) | hand | record-list documents modifiedtime (ms) since-filter with sIndex/limit<=200 paging; since-window poll with resume position and seed floor, formLinkName is a trigger param; no new-record trigger because AddedTime has no time zone (https://www.zoho.com/people/api/bulk-records.html) |
| apps/zoho/zoho-recruit | 2 | candidate-list | new-candidate, new-or-updated-candidate | apps/zoho/zoho-recruit/README.md Triggers section (verified 2026-11-09) | hand | sort_by Created_Time/Modified_Time with sort_order=desc documented on get-records |
| apps/zoho/zoho-sheet | 2 | workbook-list | new-workbook, new-or-updated-workbook | apps/zoho/zoho-sheet/README.md Triggers section (verified 2026-11-09) | hand | workbook.list sort_option recently_created/recently_modified documented |
| apps/zoho/zoho-sign | 1 | request-list | new-request | apps/zoho/zoho-sign/README.md Triggers section (verified 2026-11-09) | hand | page_context sort_column=created_time, sort_order=DESC documented; no modified sort column |
| apps/zoho/zoho-workdrive | 1 | team-member-list | new-team-member | apps/zoho/zoho-workdrive/README.md Triggers section (verified 2026-11-09) | hand | Get Team Members has no paging parameters, so the roster is one bounded request; additions are snapshotted; team folders not watched because their list pages without a documented cap (https://www.zoho.com/workdrive/developer/docs/api/v1/get-team-members.html) |
| apps/zoho/zohobooks | 2 | contact-list | new-contact, new-or-updated-contact | apps/zoho/zohobooks/README.md Triggers section (verified 2026-11-09) | hand | contact-list documents sort_column created_time and last_modified_time but no default direction, so the trigger reads page 1, infers the direction from the items' own timestamps and, unless newest-first, also reads the last two pages (found via has_more_page); ids de-duplicated, new-or-updated idOf contact_id:last_modified_time (https://www.zoho.com/books/api/v3/contacts/) |
| apps/zoho/zohodesk | 1 | contact-list | new-contact | apps/zoho/zohodesk/README.md Triggers section (verified 2026-11-09) | hand | contacts sortBy=-createdTime documented; list items carry no modified stamp |
| apps/zoho/zohomail | 1 | message-list | new-message | apps/zoho/zohomail/README.md Triggers section (verified 2026-11-09) | hand | messages/view sortBy=date, sortorder=false (newest first) documented |
| apps/zulip | 1 | get-messages | new-message | apps/zulip/README.md Triggers section (verified 2026-11-09) | hand | get-messages anchors at newest and returns messages ascending by message ID, reversed to newest-first for the kit (https://zulip.com/api/get-messages) |
| apps/zuora | 1 | invoice-list | new-or-updated-invoice | apps/zuora/README.md Triggers section (verified 2026-11-09) | hand | object-query invoices sort[]=updateddate.DESC documented (createddate is not sortable); new-or-updated covers new invoices |

## none (100)

| app | triggers | candidates | verified | source | reason |
|---|---|---|---|---|---|
| apps/adalo | 0 |  | apps/adalo/README.md Triggers section (verified 2026-11-10) | hand | list-records offers only offset/limit and a single-property equality filter; Adalo's Collections API documents no sort order or created-since filter (https://help.adalo.com/integrations/the-adalo-api/collections) |
| apps/airbyte | 0 | new-destination | no | hand | List destinations documents pagination but no creation order, update filter, or bounded collection size (https://reference.airbyte.com/reference/listdestinations) |
| apps/airtop | 0 |  | apps/airtop/README.md Triggers section (verified 2026-11-10) | hand | session-list takes only sessionIds, status, offset and limit and file-list only sessionIds, offset and limit; neither documents an order or created-since filter, and sessions are short-lived browser sessions the workflow itself opens (https://docs.airtop.ai/api-reference/airtop-api/sessions/list, https://docs.airtop.ai/api-reference/airtop-api/files/list) |
| apps/brandfetch | 0 |  | apps/brandfetch/README.md Triggers section (verified 2026-11-09) | hand | Brand search is a stateless lookup catalog, not an account record collection that can change |
| apps/chatbase | 0 |  | apps/chatbase/README.md Triggers section (verified 2026-11-09) | hand | conversation-list is ordered by createdAt with no documented direction and the action exposes no sort or since filter (https://chatbase.co/docs/api-reference/v2/conversations/list-conversations.md) |
| apps/clearbit | 0 |  | no | hand | Enrichment/prospector/reveal lookups only, no account records that change; the 202 lookup callback is per-request, not an event subscription, and no fetchable vendor page documents it (dashboard.clearbit.com/docs is a JS app; legacy keys only since HubSpot's acquisition) |
| apps/clockodo | 0 |  | apps/clockodo/README.md Triggers section (verified 2026-11-09) | hand | list-entries requires a time_since/time_until window over the entry's own time with no created/updated filter or sort, so back-dated entries never look new (https://www.clockodo.com/en/api/) |
| apps/coda | 0 |  | apps/coda/README.md Triggers section (verified 2026-11-09) | hand | list-rows returns rows by creation time ascending unless sorted, with no descending order or created-since filter (https://coda.io/developers/apis/v1#operation/listRows) |
| apps/coingecko | 0 |  | apps/coingecko/README.md Triggers section (verified 2026-11-09) | hand | list-coin-markets is a market-cap ranking, not a chronological record feed (https://docs.coingecko.com/reference/coins-markets) |
| apps/creditrepaircloud | 0 |  | apps/creditrepaircloud/README.md Triggers section (verified 2026-11-09) | hand | vendor API methods are only insertRecord/viewRecord/updateRecord/deleteRecord on one lead/client or affiliate; no list or search method exists to poll (https://app.creditrepaircloud.com/webapi/apimethods) |
| apps/crunchbase | 0 |  | apps/crunchbase/README.md Triggers section (verified 2026-11-09) | hand | search actions take a caller query plus optional order, but a newest-first created_at/updated_at feed could not be verified: Crunchbase's field/search reference is JS-rendered and its OpenAPI was not retrievable 2026-11-09 (https://data.crunchbase.com/docs/using-the-api) |
| apps/deepseek | 0 |  | apps/deepseek/README.md Triggers section (verified 2026-11-09) | hand | stateless chat/FIM completion API plus a static model list: no user records that change (https://api-docs.deepseek.com/api/list-models) |
| apps/demio | 0 |  | no | hand | event-list returns only active events ordered by next session with no created-at order or since filter; participants-list needs a session id; vendor docs unreachable 2026-11-09 (https://developers.demio.com/) |
| apps/dropcontact | 0 |  | apps/dropcontact/README.md Triggers section (verified 2026-11-10) | hand | the webhook (per-request custom_callback_url or the one account default) only delivers results of an enrichment batch the caller submitted (enrich_api_result job-completion callback, no account event stream) and the docs describe no signature or secret (https://developer.dropcontact.com/en/webhooks/) |
| apps/edenai | 0 |  | apps/edenai/README.md Triggers section (verified 2026-11-10) | hand | the webhook is a per-request webhook_receiver completion callback (async_job_completed) for a job the caller starts, not an account subscription, signed with an RSA key from Eden AI support over a canonical re-serialisation of the payload (https://www.edenai.co/docs/v3/expert-models/webhooks.md) |
| apps/enrichlayer | 0 | company-employees | apps/enrichlayer/README.md Triggers section (verified 2026-11-09) | hand | each poll needs a per-company or per-school URL and spends enrichment credits; no account-wide record feed (https://enrichlayer.com/docs) |
| apps/firecrawl | 0 | crawl.completed, batch_scrape.completed, extract.completed | apps/firecrawl/README.md Triggers section (verified 2026-11-10) | hand | Firecrawl webhooks are a per-job `webhook` object on each crawl, batch scrape, extract or agent request (and per monitor), with no account-level subscription to register: they only report completion of jobs this app starts itself, not an account event stream (https://docs.firecrawl.dev/webhooks/overview). |
| apps/formidableforms | 0 |  | apps/formidableforms/README.md Triggers section (verified 2026-11-09) | hand | entries list documents no sort token, created-since semantics or page size (https://formidableforms.com/knowledgebase/formidable-api-rest-endpoints/) |
| apps/fortnox | 0 |  | apps/fortnox/README.md Triggers section (verified 2026-11-09) | hand | customer-list orders only by customer number or name and its lastmodified filter cannot separate new from edited customers (https://developer.fortnox.se/documentation/resources/customers/) |
| apps/fullenrich | 0 | enrichment completion | apps/fullenrich/README.md Triggers section (verified 2026-11-10) | hand | FullEnrich's webhook is a `webhook_url` field on each enrichment or reverse-email request with no account-level subscription: it only reports completion of a job this app starts itself, not an account event stream (https://docs.fullenrich.com/api/v2/general/webhooks). |
| apps/gcs | 0 |  | apps/gcs/README.md Triggers section (verified 2026-11-09) | hand | object listings are lexicographic by object name and object-change notifications publish to Pub/Sub rather than an HTTP event subscription |
| apps/giphy | 0 |  | apps/giphy/README.md Triggers section (verified 2026-11-09) | hand | search, trending, random, and translate endpoints return catalog results rather than account records that change |
| apps/google/gemini | 0 |  | apps/google/gemini/README.md Triggers section (verified 2026-11-09) | hand | model-list and generation APIs are stateless inference resources, not user records with change events |
| apps/google/google-admin | 0 |  | apps/google/google-admin/README.md Triggers section (verified 2026-11-09) | hand | users.list can only be ordered by EMAIL, FAMILY_NAME or GIVEN_NAME and its query has no creation-time filter, so no existing list sees new users (https://developers.google.com/workspace/admin/directory/reference/rest/v1/users/list) |
| apps/google/google-ads | 0 |  | apps/google/google-ads/README.md Triggers section (verified 2026-11-09) | hand | customer_client rows carry no creation time and the list is ordered by hierarchy level, so a new sub-account in a large manager cannot be told apart from a bounded page (https://developers.google.com/google-ads/api/reference/rpc/latest/CustomerClient) |
| apps/google/google-analytics | 0 |  | apps/google/google-analytics/README.md Triggers section (verified 2026-11-09) | hand | account and property lists are paginated configuration reads with no documented newest-first order or changed-since filter |
| apps/google/google-docs | 0 |  | apps/google/google-docs/README.md Triggers section (verified 2026-11-09) | hand | the Docs API exposes get and mutation methods for a known document ID, but no document collection list endpoint |
| apps/google/google-maps | 0 |  | apps/google/google-maps/README.md Triggers section (verified 2026-11-09) | hand | geocoding, routing, places, and elevation APIs are stateless request/response services with no user-record collection |
| apps/google/google-slides | 0 |  | apps/google/google-slides/README.md Triggers section (verified 2026-11-09) | hand | the Slides API gets or modifies a known presentation ID but has no presentation list endpoint |
| apps/google/google-vertex-ai | 0 |  | apps/google/google-vertex-ai/README.md Triggers section (verified 2026-11-09) | hand | batch prediction job listing has no documented newest-first order or created/updated-since filter (https://cloud.google.com/vertex-ai/docs/reference/rest/v1/projects.locations.batchPredictionJobs/list) |
| apps/google/googlesearchconsole | 0 |  | apps/google/googlesearchconsole/README.md Triggers section (verified 2026-11-09) | hand | the site list returns every accessible site with no documented bounded collection cap or change filter (https://developers.google.com/webmaster-tools/v1/sites/list); 'new site' rejected: adding a verified site is a rare admin act, not a record stream |
| apps/google/looker | 0 |  | apps/google/looker/README.md Triggers section (verified 2026-11-09) | hand | existing dashboard and Look actions read unbounded collections without a newest-first order or since filter (https://cloud.google.com/looker/docs/reference/looker-api/latest); connection and model lists are rarely-changing admin configuration, rejected |
| apps/grist | 0 | new-record | apps/grist/README.md Triggers section (verified 2026-11-09) | hand | list-records has no app-independent creation-time sort; each table chooses its own schema. |
| apps/groq | 0 |  | apps/groq/README.md Triggers section (verified 2026-11-09) | hand | the existing batch list action exposes no documented newest-first order or created/updated-since filter (https://console.groq.com/docs/batch) |
| apps/hedy | 0 |  | apps/hedy/README.md Triggers section (verified 2026-11-09) | hand | session and highlight lists are cursor-paged without a documented newest-first order or created/updated-since filter (https://api.swaggerhub.com/apis/HedyAI/hedy-api/1.0.1) |
| apps/holded | 0 |  | apps/holded/README.md Triggers section (verified 2026-11-09) | hand | CRM list endpoints return uncapped full collections with no documented ordering or since filter (https://holded.readme.io/reference); the funnel list is rarely-changing account configuration, rejected as a 'new funnel' event |
| apps/htmlcsstoimage | 0 |  | apps/htmlcsstoimage/README.md Triggers section (verified 2026-11-09) | hand | the image list GET /v1/images documents only page_token and count: no stated order and no since-filter, so new images cannot be told from old ones (https://htmlcsstoimage.com/openapi/v1.json) |
| apps/jev | 0 |  | apps/jev/README.md Triggers section (verified 2026-11-09) | hand | stateless typed-evaluation API: `evaluate` is a compute call and `list-models` returns the static model catalog, so there are no user records that change (https://docs.typesafe.ai) |
| apps/jinaai | 0 |  | apps/jinaai/README.md Triggers section (verified 2026-11-09) | hand | `batches-list` takes only a `limit` (no documented sort or created-after filter) and is not the whole collection, and `classifiers-list` was measured returning `500` for every request, so no list action is a reliable record feed; the rest is stateless embeddings, rerank and classify compute (https://api.jina.ai/openapi.json: /v1/batches takes only `limit`) |
| apps/kvcore | 0 | new-user | apps/kvcore/README.md Triggers section (verified 2026-11-09) | hand | user-list takes only an updated-since filter and documents no created-time field or sort, so a new user cannot be told from an edited one (https://developer.insiderealestate.com/publicv2/reference/get_v2-public-users) |
| apps/lodgify | 0 |  | no | hand | list-bookings has no sort order and no created-since filter, only updatedSince with no documented booking stamp to tell new from edited; vendor docs 403 to curl so default order unverifiable (https://docs.lodgify.com/reference/list-bookings) |
| apps/mailcheck | 0 |  | no | hand | email-validation API lists batch-operation jobs, not durable created records |
| apps/meta/facebook-conversions | 0 |  | no | hand | dataset diagnostics and quality endpoints are analytics/report resources, not durable record lists |
| apps/meta/facebook-custom-audiences | 0 |  | no | hand | custom-audience lists are cursor paged without documented newest-first ordering, a since filter, or bounded collection guarantee |
| apps/metabase | 0 | new-record | apps/metabase/README.md Triggers section (verified 2026-11-09) | hand | collection-items sorts by last_edited_at but the item payload documents no edit timestamp to key an edit on; other list/search actions have no created-time order or since filter (https://www.metabase.com/docs/latest/api/collection). |
| apps/metricool | 0 |  | no | hand | scheduled-post listing requires a caller-supplied date range and lacks a documented newest-first or since-cursor contract |
| apps/microsoft/microsoft-todo | 0 | new-task | apps/microsoft/microsoft-todo/README.md Triggers section (verified 2026-11-09) | hand | Graph docs name no sort or created-since parameter list-tasks is documented to honour, and list-task-changes is delta-ordered (https://learn.microsoft.com/en-us/graph/api/todotasklist-list-tasks?view=graph-rest-1.0). |
| apps/mindee | 0 | inference processed | apps/mindee/README.md Triggers section (verified 2026-11-10) | hand | the only webhook is a per-job completion callback (the endpoint id is passed on each enqueue call, so it fires for any upload naming the endpoint, from any client) and the docs name an X-Signature HMAC header without stating its algorithm (https://docs.mindee.com/integrations/webhooks) |
| apps/mistral | 0 |  | apps/mistral/README.md Triggers section (verified 2026-11-09) | hand | stateless AI inference API; its model list is a capability catalog, not a changing user-record feed |
| apps/motion | 0 |  | apps/motion/README.md Triggers section (verified 2026-11-09) | hand | task and project actions use opaque cursors with no documented creation-time order or since filter |
| apps/msg91 | 0 |  | apps/msg91/README.md Triggers section (verified 2026-11-09) | hand | no fetchable MSG91 webhook documentation found (docs.msg91.com/reference/webhooks 404); existing lists are templates, numbers, analytics and windowed delivery logs, not a stable new-record collection |
| apps/murf | 0 | DUB_JOB | apps/murf/README.md Triggers section (verified 2026-11-10) | hand | the only webhook is a completion callback for a dubbing job the caller starts (webhook URL and HMAC secret are supplied in each create-job request), not an account event stream; voice and project lists lack new-record ordering or a since filter (https://murf.ai/api/docs/capabilities/dubbing/webhooks) |
| apps/mux | 0 | new-asset-list | apps/mux/README.md Triggers section (verified 2026-11-09) | hand | asset-list has no documented sort order or created-since filter (params: limit, page, live_stream_id, upload_id; https://github.com/muxinc/mux-node-sdk/blob/master/src/resources/video/assets.ts) |
| apps/netsuite | 0 |  | apps/netsuite/README.md Triggers section (verified 2026-11-09) | hand | generic record listing accepts arbitrary record types and filtering but has no fixed record schema or documented newest-first ordering for a safe poll |
| apps/neverbounce | 0 | job_parsing_finished, job_failed, job_deleted | apps/neverbounce/README.md Triggers section (verified 2026-11-10) | hand | the only callbacks are per-job events for a bulk job the caller creates (callback_url set in the job-create request), unsigned; job search has no documented newest-first order (https://developers.neverbounce.com/reference/job-callbacks) |
| apps/newrelic | 0 |  | apps/newrelic/README.md Triggers section (verified 2026-11-09) | hand | NerdGraph entity and issue searches use cursors but existing actions expose no documented newest-first or since-created query |
| apps/ollama | 0 |  | apps/ollama/README.md Triggers section (verified 2026-11-09) | hand | local model listing is server capability state, not a user-record feed with creation ordering |
| apps/ollama-cloud | 0 |  | apps/ollama-cloud/README.md Triggers section (verified 2026-11-09) | hand | hosted model listing is a capability catalog, not a changing user-record feed |
| apps/onepassword | 0 | new-item-file-list | apps/onepassword/README.md Triggers section (verified 2026-11-09) | hand | no existing list fits: Connect collections have no documented sort or created-since filter; audit-event/signin-attempt are start_time cursor streams with unstated order (https://developer.1password.com/docs/events-api/reference/) |
| apps/onesimpleapi | 0 |  | apps/onesimpleapi/README.md Triggers section (verified 2026-11-09) | hand | stateless conversion, generation, lookup, and validation utility API with no account records |
| apps/openrouter | 0 |  | apps/openrouter/README.md Triggers section (verified 2026-11-09) | hand | list-models is offset-paged (limit up to 1000) with no total, so one request cannot be shown to hold the whole catalog for a snapshot; the other actions are inference, usage or single-resource lookups with no record feed; no webhook offering found in the API reference. |
| apps/opusclip | 0 | project created | apps/opusclip/README.md Triggers section (verified 2026-11-10) | hand | the only webhook is a conclusionActions WEBHOOK on the create-project request, a completion callback for a project the caller starts, not an account event stream; clip-list needs a selected project and has no creation-order or since filter (https://help.opus.pro/api-reference/webhook) |
| apps/pdfco | 0 |  | apps/pdfco/README.md Triggers section (verified 2026-11-10) | hand | PDF.co's only webhook is a per-request `callback` URL reporting completion of an async job the caller starts itself; no account event stream or webhook registration, and no list action with a changing feed (https://developer.pdf.co/api/webhooks) |
| apps/pinterest | 0 | new-pin | apps/pinterest/README.md Triggers section (verified 2026-11-09) | hand | pin-list/pin-search (GET /v5/pins) document no sort order and no date filter, and boards/ad accounts are not documented as bounded (https://developers.pinterest.com/docs/api/v5/pins-list/) |
| apps/plaud | 0 |  | apps/plaud/README.md Triggers section (verified 2026-11-09) | hand | transcription-get and device-binding-get need a supplied resource id; docs.plaud.ai/llms.txt lists no list endpoint and no webhook offering. |
| apps/postbin | 0 |  | apps/postbin/README.md Triggers section (verified 2026-11-09) | hand | request inbox actions fetch or shift one known request and expose no bounded list of new requests |
| apps/printful | 0 | new-order | apps/printful/README.md Triggers section (verified 2026-11-09) | hand | order-list (GET /orders) takes only status/offset/limit; the v1 reference states no sort order and no created-after filter (https://developers.printful.com/docs/) |
| apps/procore | 0 | new-submittal | apps/procore/README.md Triggers section (verified 2026-11-09) | hand | submittal-list needs a per-project id and a descending sort whose syntax is only published in a JS-rendered reference that could not be verified (https://developers.procore.com/reference/rest/submittals) |
| apps/prospeo | 0 |  | apps/prospeo/README.md Triggers section (verified 2026-11-09) | hand | enrichment and search endpoints compute or look up supplied prospects rather than list account records |
| apps/pushover | 0 |  | apps/pushover/README.md Triggers section (verified 2026-11-09) | hand | none: only 4 calls (message-send, user-validate, sounds-list, limits-get); no record-list action (https://pushover.net/api) |
| apps/qualtrics | 0 | event subscription | apps/qualtrics/README.md Triggers section (verified 2026-11-10) | hand | Qualtrics event subscriptions exist and are API-registered, but the signature scheme cannot be established: https://api.qualtrics.com/ redirects to https://developer-docs.qualtrics.com/public-api/, whose static pages (e.g. .../docs/public-api/eventSubscriptions/create-subscription/) say to compare an HMAC of the message body with the HMAC in the event message but never name the header/field, algorithm or encoding (re-checked 2026-11-10) |
| apps/quickchart | 0 |  | apps/quickchart/README.md Triggers section (verified 2026-11-09) | hand | stateless chart, QR, barcode and image rendering API has no account record lists |
| apps/recruit-crm | 0 |  | apps/recruit-crm/README.md Triggers section (verified 2026-11-09) | hand | none: GET /v1/jobs sort_by/sort_order undocumented values and no created/updated-since filter (https://api.recruitcrm.io/docs) |
| apps/recruiterflow | 0 |  | apps/recruiterflow/README.md Triggers section (verified 2026-11-09) | hand | candidate, client, job and deal lists paginate by page number with no documented newest-first order or since filter |
| apps/respondio | 0 |  | apps/respondio/README.md Triggers section (verified 2026-11-09) | hand | contact-list is a caller-filtered POST /contact/list with cursor paging and no documented created/updated sort; a built-in created-timestamp filter via isTimestampBetween is unverified (vendor reference is a JavaScript shell) |
| apps/rocketreach | 0 | person lookup completed | apps/rocketreach/README.md Triggers section (verified 2026-11-10) | hand | the only webhook delivers the result of a People Lookup/Bulk People Lookup the caller itself starts (webhook_id on the lookup request): a job-completion callback, not an account event stream (https://docs.rocketreach.co/reference/webhooks) |
| apps/runway | 0 |  | apps/runway/README.md Triggers section (verified 2026-11-09) | hand | list-avatars is cursor-paged (limit max 100) with no documented order, since filter or total cap; routers, voices and workflows list likewise without a documented cursor/filter (https://docs.dev.runwayml.com/api) |
| apps/semrush | 0 |  | apps/semrush/README.md Triggers section (verified 2026-11-09) | hand | backlink, keyword, and domain endpoints are analytics/report queries, not account-owned changing records |
| apps/sendy | 0 |  | apps/sendy/README.md Triggers section (verified 2026-11-09) | hand | brand-list and list-list are installation configuration reads (list-list needs a brand id per call) with no created/updated field or since filter documented |
| apps/sierrainteractive | 0 |  | apps/sierrainteractive/README.md Triggers section (verified 2026-11-09) | hand | lead-find is an individual lookup and remaining lists are reference data, with no documented lead change feed |
| apps/snowflake | 0 |  | apps/snowflake/README.md Triggers section (verified 2026-11-09) | hand | database-list and warehouse-list run SHOW metadata statements (objects, not a record feed), and statement-get/execute are per-statement SQL calls; the SQL API has no list-of-events endpoint (https://docs.snowflake.com/en/developer-guide/sql-api/index) |
| apps/splunk | 0 |  | apps/splunk/README.md Triggers section (verified 2026-11-09) | hand | search-get-many reads /services/search/jobs, a list of short-lived search jobs (expire on a TTL) and the action exposes only count/offset, no sort_key/sort_dir or since filter; saved-search and index lists are configuration objects, not events; dev.splunk.com REST reference was not fetchable as text from the lane (https://dev.splunk.com/enterprise/docs/reference/rest-api/) |
| apps/streamtime | 0 | new-record | apps/streamtime/README.md Triggers section (verified 2026-11-09) | hand | search-records sorts by a per-view sortColumn from Search Setup and defaults to ascending; the spec names no creation column or id for every view (https://api.streamtime.net/swagger.json) |
| apps/supadata | 0 | new-youtube-result | apps/supadata/README.md Triggers section (verified 2026-11-09) | hand | youtube-search is a search over public YouTube results (sortBy relevance/rating/date/views), not a feed of the account's own records (https://docs.supadata.ai/youtube/search) |
| apps/talentlms | 0 |  | apps/talentlms/README.md Triggers section (verified 2026-11-09) | hand | user/course/group/branch get-many and ILT session lists in the v1 API are unpaged-or-paged lookups with no documented sort order, no created/updated-since filter and no webhook for them (https://market.talentlms.com/pages/docs/TalentLMS-API-Documentation.pdf) |
| apps/taskade | 0 | new-project | apps/taskade/README.md Triggers section (verified 2026-11-09) | hand | my-project-list documents only 'Sort options: viewed-asc, viewed-desc' (last viewed, not created) and no created-since filter (https://docs.taskade.com/developers/comprehensive-api-guide/) |
| apps/tavily | 0 |  | apps/tavily/README.md Triggers section (verified 2026-11-09) | hand | search, extract, crawl, map and research endpoints are request-scoped jobs keyed by the caller's query, not an account record collection; usage-get is a single counter (https://docs.tavily.com/documentation/api-reference/introduction) |
| apps/thanksio | 0 | order-list, mailing-list-recipients-list | apps/thanksio/README.md Triggers section (verified 2026-11-10) | hand | order-list documents only 'recent orders' with no sort or since filter; mailing-list-recipients-list filters only by updated_since (an edit also matches), documents no sort order, prints created_at zone-less, and the action sends no page (https://docs.thanks.io/api-reference/openapi.json) |
| apps/tickettailor | 0 | issued-ticket-list | apps/tickettailor/README.md Triggers: not shipped line (verified 2026-11-09) | hand | issued-ticket-list has cursor paging only, no documented sort or created-after filter (https://developers.tickettailor.com/) |
| apps/tidio | 0 | ticket-list | apps/tidio/README.md Triggers: not shipped line (verified 2026-11-09) | hand | GET /tickets takes only a cursor, no documented sort or filter (https://developers.tidio.com/reference/get_tickets.md) |
| apps/tidycal | 0 |  | apps/tidycal/README.md Triggers section (verified 2026-11-09) | hand | booking-list filters by starts_at/ends_at (the booking's own time, not its creation) and contact-list takes only a page number, neither documents a sort order or created-since filter (https://tidycal.com/developer/docs/) |
| apps/twilio/segment | 0 |  | apps/twilio/segment/README.md Triggers section (verified 2026-11-09) | hand | the HTTP Tracking API actions (identify, track, page, group, alias, batch) are write-only ingestion calls with no list endpoint for emitted events (https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/) |
| apps/upstash | 0 |  | apps/upstash/README.md Triggers section (verified 2026-11-09) | hand | Upstash Redis REST commands run against caller-chosen keys and collections: no account record list with stable ids and no created/updated filter or sort (https://upstash.com/docs/redis/features/restapi) |
| apps/webscrapingai | 0 | serp-search | apps/webscrapingai/README.md Triggers section (verified 2026-11-09) | hand | serp-search is a query-driven search result, not a persistent record feed (https://docs.webscraping.ai/web-scraping-api/serp-api/) |
| apps/wiza | 0 |  | apps/wiza/README.md Triggers section (verified 2026-11-10) | hand | Wiza's only webhook is a per-job completion callback (callback_url on create-list, create-prospect-list, start-individual-reveal, or the account default URL) for jobs the caller starts via the API, not a subscribable account event stream (https://docs.wiza.co/swagger/v1/openapi.yaml) |
| apps/woodpecker | 0 | prospect-list | apps/woodpecker/README.md Triggers section (verified 2026-11-09) | hand | prospect-list/prospect-search have sort and diff (changed-since) but the reference is script-rendered and no creation stamp or prospect update field could be confirmed (https://developers.woodpecker.co/) |
| apps/workday | 0 |  | apps/workday/README.md Triggers section (verified 2026-11-09) | hand | collection actions are tenant-specific offset-paginated reports whose vendor docs sit behind the tenant login, so no created/updated filter, sort or bounded size can be cited (https://community.workday.com/sites/default/files/file-hosting/restapi/index.html) |
| apps/workiz | 0 |  | apps/workiz/README.md Triggers section (verified 2026-11-09) | hand | lead-list is ordered and windowed by the scheduled LeadDateTime (start_date until today), not creation, so a lead scheduled outside the window never appears and no created-ordered feed exists (http://developer.workiz.com/api.json) |
| apps/zerobounce | 0 |  | apps/zerobounce/README.md Triggers section (verified 2026-11-09) | hand | stateless validation and credit-usage API: no changing record feed (https://www.zerobounce.net/docs/) |
| apps/zoho/zoho-projects | 0 |  | no | hand | issue-list needs a caller-selected portal and project and its sortBy option has no direction; the V3 reference (https://projects.zoho.com/api-docs) is script-rendered and does not expose the issues sort/criteria syntax to verify; project-list/task-list (sortBy DESC(created_time) in lib/params.ts) re-checked, not verifiable against the script-rendered docs |
