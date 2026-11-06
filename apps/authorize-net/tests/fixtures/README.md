# Reference requests

`reference-requests.json` contains JSON examples from the official
[Authorize.Net API reference](https://developer.authorize.net/api/reference/index.html), retrieved
2026-11-05. The first example for each supported API request is retained. Only
`merchantAuthentication` was replaced with synthetic test values. Example dates and test card
numbers are historical vendor samples; these fixtures are used offline, never submitted.

Property order is part of the fixture contract. Do not sort these JSON keys. Tests compare the
serialized final request to this independent reference after recursively reversing caller keys.
