# Shared site and equipment QR labels

PhaseKit stores working records on the current device. Sharing is a separate,
explicit action: open a site or equipment page, review the sharing preview, and
press **Share to server and create QR** (or **Update server copy**). The server
stores one validated document snapshot, not a live synchronization stream.
Local changes never upload automatically. The page distinguishes the local
save state from the date and freshness of the server snapshot.

The snapshot contains the chosen site/device, associated equipment, electrical
readings, electrical inspection reports, refrigeration reports and calculation
history. Technician/contact details, notes and measurement photos are included.
Mixed-scope electrical reports are excluded rather than rewriting a frozen
report. Unrelated records, local settings, the active measurement session,
favourites and sharing credentials are excluded by an explicit schema allowlist.

## Access and ownership

- The QR contains only the installation's origin and `/#/shared/<random-id>`.
  The 128-bit random ID alone cannot read the document.
- The label prints a separate 16-character Crockford code in four groups
  (80 random bits). Anyone with the label or its photo can type this code and
  read the snapshot. This is the user's chosen accountless access model.
- A separate random 256-bit editing secret remains in local storage and JSON
  backups. The original web origin is preserved in the backup; importing on another
  origin retains the original QR URL and disables update/revocation there. Open
  the original website to manage that share. It is never included in QR links, label images, read responses or
  shared snapshots. Reading does not grant update/revocation access.
- Creating a share durably saves the ID and both credentials locally before
  sending anything. If the first response is lost, retrying uses the same
  credentials/ID and returns the existing receipt without overwriting it.
- After a lost update response or a stale-revision conflict, **Recover sharing
  details** authenticates with the existing credentials and retrieves the current
  server receipt without replacing its snapshot. Matching content is confirmed;
  different content is flagged for review before an explicit replacement.
- Keep a backup to retain editing access on another device. Lost editing keys
  cannot be recovered through the read code. Deleting a local asset does not
  revoke its previously shared server copy; revoke it explicitly first.
- Revocation conditionally replaces the server object with a revoked tombstone.
  It blocks further reads and replayed creation requests for that ID. The stored
  snapshot remains in the revoked object; this is access revocation, not a data
  erasure workflow.

A shared view is read only and has its own refrigeration/electrical PDF actions.
It forgets the entered read code when closed/reloaded. **Import to this device
and continue in Tools** is an explicit local copy operation. It appends missing
records, refuses conflicting IDs, and does not import an editing key. After
import, a new refrigeration report uses the existing equipment prefill helper.

## Server boundary

The modern Netlify function lives in `netlify/functions/shared-assets.mts`.
It uses `@netlify/blobs` with strong consistency and atomic conditional writes.
Production uses the site-wide `phasekit-shared-assets-v1` store so links survive
production deployments. Branch/deploy previews use deploy-scoped stores, isolated
from production; their snapshots do not survive deletion of that preview.

| Request | Credential | Behavior |
| --- | --- | --- |
| `POST /api/shared-assets` | ID, read code, editing secret in JSON body | Create only if new; authenticated creation retry returns stored receipt |
| `POST /api/shared-assets/:id/read` | Read code in JSON body | Return validated snapshot |
| `PUT /api/shared-assets/:id` | Editing secret as `Authorization: Bearer …`; expected ETag in JSON | Replace whole snapshot only if ETag matches |
| `DELETE /api/shared-assets/:id` | Editing secret and expected ETag | Revoke via conditional tombstone write |
| Bare `GET` / `HEAD` / reads without a valid code | None | Generic access-denied response, no existence disclosure through these read requests |

Credentials are SHA-256 hashed at rest and compared with constant-time hash
comparison. No request bodies, credentials or asset content are logged. All
responses use `Cache-Control: no-store`, `Referrer-Policy: no-referrer` and
`X-Content-Type-Options: nosniff`. There are no CORS headers. Cross-origin browser
requests are rejected. Read credentials never travel in URLs.

The function bounds bodies to 4,000,000 bytes while streaming, validates all
record types, rejects duplicate IDs and rejects unrelated embedded electrical
readings. Netlify's edge configuration rate-limits the endpoint to 30 requests
per 60 seconds per IP/domain combination. There are no in-memory security
counters. The beta deployment returned HTTP 429 after crossing the threshold and allowing
Netlify’s documented enforcement delay (up to 10 seconds). This is a distributed
rate control, not a strict immediate per-request counter. Local handler tests
alone do not prove the hosted edge policy. Creation may
return a different status for a new ID versus an occupied ID; hiding that
existence signal is outside this accountless first version. A known ID still
grants no record access without its separate read code.

Storage/network failures leave local data and pending sharing credentials intact.
A QR label is shown only after a successful server receipt. The App blocks
accidental page unload while local writes are pending/failed and provides a
retry action for a failed write. An initial load failure never enables that
retry to overwrite unread existing storage with an empty state.

## QR generation and printing

`qrcode` generates black-on-white square QR modules with a four-module white
quiet zone at an integer eight-pixel scale. A label canvas places the readable
asset title/identifier and read code outside the QR/quiet zone. PNG download and
printing use the same canvas image and therefore the same payload. Long titles
wrap over up to three lines; the identifier remains separately readable.
The scanner accepts only this installation's recognized site/equipment/shared
URLs. Camera scanning uses optional native `BarcodeDetector` support; the paste
field and phone camera app remain the fallback. Late camera streams are stopped
on navigation, and simultaneous start requests are prevented.

## Verification

`tests/asset-sharing.test.ts` exercises filtering and sanitization, mixed-report
exclusion, duplicates, imports, backup preservation, read gating, separate owner
rights, conditional update conflict, revocation, request bounds, cross-origin
rejection and idempotent creation recovery. `tests/asset-qr.test.ts` independently
decodes an actual PNG with jsQR and checks all four white quiet-zone strips.
`tests/e2e/asset-sharing.spec.ts` checks the explicit sharing flow, the read-code
gate across reload, lost-response recovery, and independently decodes both the
downloaded label PNG and the print-window image to the same permanent URL.

The bundled Netlify Blobs 11.1.9 local emulator currently omits the `ETag` header
from GET/HEAD responses (`@netlify/blobs/dist/server.js`, `get`/`head`), despite
returning one on writes. The production adapter fails closed when a read has no
ETag; it does not synthesize a revision or weaken conditional updates. Unpatched
Netlify Dev therefore cannot complete a read/update integration check with this
emulator version. Treat that as a local emulator limitation, not production
verification.

Live beta verification on 11 November 2026 (0.5.0-beta.7) passed synthetic
create/read/update/conflict/revoke and lost-create retry checks against real
Netlify Blobs. A downloaded QR PNG was independently decoded and opened in an
isolated mobile WebKit browser with no account or local site record; wrong-code
reads failed, the correct code opened the snapshot, and owner revocation blocked
subsequent reads. Test shares were revoked. The matching CI candidate passed
503 unit tests and 45 focused browser tests (one existing WebKit offline test
skipped); local integration additionally covered current commissioning and
operating-assessment paths.

Official platform references: [Functions API](https://docs.netlify.com/build/functions/api/),
[Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/),
[rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/).
