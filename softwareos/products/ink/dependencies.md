# Dependencies

## Internal

| Service | Provided by | Used for |
|---|---|---|
| (none) | | Single product, single repo |

## External

| Service | Purpose | Auth method | Docs |
|---|---|---|---|
| Railway | Hosts the API container + managed Postgres | Railway account / project tokens | https://docs.railway.com |
| Cloudflare R2 | Image and attachment storage (S3-compatible) | Access key + secret (API only) | https://developers.cloudflare.com/r2/ |
| Apple App Store Connect / TestFlight (after the MVP) | App distribution, Face ID entitlement | Paid Apple Developer account, deferred until MVP acceptance | https://developer.apple.com |
| Expo / EAS | EAS Update for Expo Go demos during the MVP; builds/submission later | Expo account token | https://docs.expo.dev |
| Resend (phase 2) | Newsletter email, attachments, delivery status | API key (API only) | https://resend.com/docs |
