# Security Specification: Guardian AI Firebase Security

## 1. Data Invariants
- **User Profile Security**: Users can only read and write their own profile document (`/users/{userId}`). 
- **Leaderboard Accessibility**: The user list `/users` is readable by authenticated users for rendering ranking, but they can only read public fields (displayName, points, streak, currentMood, guardianRank, photoURL) or we filter on the rules side.
- **Task Protection**: Users can only read and write tasks belonging directly within their user profile document path (`/users/{userId}/tasks/{taskId}`).
- **Temporal Integrity**: `updatedAt` and `createdAt` must match `request.time`.
- **Identity Integrity**: Users cannot set points, streaks, or ranks when creating or modifying their profile if it does not match logical state transitions, preventing cheating.

## 2. The "Dirty Dozen" Payloads (Exploit Scenarios)
1. **User Profile Hijacking**: Attempting to write into another user's profile (`/users/userB` as `userA`).
2. **Point Manipulation via Profile Create**: Setting initial `points` to `999999` on creation.
3. **Streak Spoofing**: Overwriting current streak with `1000` on update.
4. **Invalid Character IDs**: Injecting 1.5MB junk string as taskId (ID Poisoning).
5. **PII Exposure in List**: A malicious user scraping other users' private email settings / fit credentials in a broad fetch.
6. **Self-Elevating Admin Role**: Appending an administrative flag or making themselves a leader.
7. **Task Hijacking**: Attempting to create tasks under another user's `/courses/{userB}/tasks/taskId`.
8. **Negative Time Machine**: Backdating `createdAt` or `updatedAt` to bypass future routine expectations.
9. **Spamming Empty Tasks**: Generating documents with zero length title, or 10MB descriptions (Denial of Wallet).
10. **Bypassing Category Constraints**: Setting a task's `category` to a malicious shell script string.
11. **Illegal Completion Transitions**: Completing a task without matching `completedAt` or setting `points` directly.
12. **Bypassing Force Locks**: Modifying locked achievements.

## 3. Test Cases (TDD Verification)
All dirty dozen operations MUST return `PERMISSION_DENIED` in our database security tests.
The system implements strict matching matching in `firestore.rules`.
