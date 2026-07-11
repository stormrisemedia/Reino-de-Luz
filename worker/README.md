# Live status + push notifications Worker

Checks whether Reino de Luz is live on YouTube and sends browser push notifications when a stream starts.

## Deploy

```bash
cd worker
npm install
npx wrangler secret put VAPID_PRIVATE_KEY
# paste the JWK private key JSON as a single line
npx wrangler deploy
```

Public VAPID key is in `wrangler.toml` (`VAPID_PUBLIC_KEY`). Keep the private key only as a Wrangler secret.

Subscribe/unsubscribe require an allowlisted browser `Origin` and only accept known Web Push service endpoints (FCM, Mozilla, Apple, WNS).

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | `{ "live": true/false }` |
| GET | `/vapid-public-key` | public key for browser subscribe |
| POST | `/subscribe` | store PushSubscription JSON |
| POST | `/unsubscribe` | remove by `{ "endpoint": "..." }` |

A cron every 2 minutes refreshes live status and notifies subscribers on offline → live transitions.
