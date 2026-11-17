# Security Specification – PINOY BIG BROTHER 3.0 (PBB ALL ACCESS)

## 1. Data Invariants
1. **Identity Isolation**: Users may only read and update their own `/users/{userId}` document and `/voting_wallets/{userId}` document. Public `list` on `/users`, `/voting_wallets`, and `/payment_transactions` is strictly restricted to verified administrators (or `resource.data.userId == request.auth.uid` for personal history queries).
2. **Privilege Escalation Prevention**: Users cannot assign themselves `role: "admin"` during creation or elevate their `role` during profile updates. Only existing verified administrators (`mjay63510@gmail.com` or records in `/admins/{uid}`) may manage `/admins`, `/voting_packages`, or modify `users.role`.
3. **One-Vote-Per-Poll & Point-Vote Atomicity**: Every binary vote in `/fan_poll_votes/{pollId}_{uid}` and every point allocation in `/point_votes/{voteId}` requires the parent `/fan_polls/{pollId}` to be `'open'`, requires `request.auth.token.email_verified == true`, and must occur atomically alongside updating `/fan_polls/{pollId}` and deducting points from `/voting_wallets/{uid}` via `existsAfter` / `getAfter`.
4. **Free 100-Point Wallet Cap**: Initial `/voting_wallets/{userId}` creation strictly enforces `freePoints == 100`, `premiumPoints == 0`, `totalFreeClaimed == 100`, `totalPurchasedPoints == 0`, `totalPointsSpent == 0`, paired with server-side device fingerprint and IP rate-limit checks.
5. **Sandbox GCash Payment Atomicity**: `/payment_transactions/{txId}` creation requires `isSandbox == true`, `0 <= amountPhp <= 90`, `100 <= pointsCredited <= 1000`, a server-issued verification token (`>= 16` chars), and atomic crediting of `premiumPoints` on `/voting_wallets/{uid}` via `getAfter` in the same batch.
6. **Content Integrity**: Only verified administrators can create, edit, or delete `/housemates`, `/livestreams`, `/stream_schedule`, `/news_articles`, `/announcements`, `/site_settings`, `/voting_packages`, and `/activity_logs`.
7. **Path & Payload Bounds**: Every document ID matches `^[a-zA-Z0-9_-]+$` (`<= 128` chars), and every string/array field enforces strict `.size()` bounds.
8. **Live Chat & Ranking Integrity**: Only verified authenticated users may post to `/live_chat_messages/{messageId}` (`createdAt == request.time`, `role == 'user'` unless `isAdmin()`) and cast one atomic vote per category via `/ranking_votes/{categoryId}_{uid}` alongside incrementing `totalVotes` by `1` when `isOpen == true`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Self-Assigned Admin on Signup**: `POST /users/{uid}` with `{ role: "admin", ... }` by non-admin user.
2. **Role Escalation Update**: `PATCH /users/{uid}` changing `role` from `"user"` to `"admin"`.
3. **PII Cross-User Read**: `GET /voting_wallets/{otherUid}` or `LIST /payment_transactions` without `userId == uid` filter by regular fan user.
4. **Unverified Email Wallet/Vote Spoof**: Token with `email_verified: false` creating `/voting_wallets/{uid}` or `/point_votes/{id}`.
5. **Shadow Field Injection**: `POST /payment_transactions/{id}` or `/point_votes/{id}` containing an undeclared extra field `isBypassed: true`.
6. **Free Point Minting Tampering**: `POST /voting_wallets/{uid}` with `{ freePoints: 99999, premiumPoints: 50000 }` instead of `{ freePoints: 100, premiumPoints: 0 }`.
7. **Vote on Closed Poll**: `POST /point_votes/{id}` when `/fan_polls/{pollId}.status == "closed"`.
8. **Orphan Poll Counter Tampering**: `PATCH /fan_polls/{pollId}` incrementing `totalVotes` without a matching batch `point_votes` + `voting_wallets` deduction.
9. **Oversized Package / Price Tampering**: `POST /payment_transactions/{id}` with `pointsCredited: 50000` or `amountPhp: 5000` or `isSandbox: false`.
10. **Wallet Top-Up Without Transaction**: `PATCH /voting_wallets/{uid}` incrementing `premiumPoints` without atomic `payment_transactions/{txId}` creation or replaying an already-existing `txId`.
11. **Oversized ID Poisoning**: Document ID longer than 128 characters or containing `/` / `$`.
12. **Timestamp Forgery**: Creating a transaction, wallet, or point vote with backdated `createdAt` not equal to `request.time`.
