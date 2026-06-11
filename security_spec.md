# Security Specification

## 1. Data Invariants
- **Person schema integrity**: A Person document inside Firestore `/people/{personId}` must contain `name` and `faceImageURL` fields, both of which must be non-empty strings.
- **Limit size**: The `name` must be a string up to 128 characters, and the `faceImageURL` must be a string representing either a valid HTTPS URL or standard base64 data URL up to 500KB.
- **Write validation**: Only authenticated requests are allowed to create/modify/delete face directory documents, while the public/guests can query the directory for face scanning verification.

## 2. The "Dirty Dozen" Malicious Payloads
Here are 12 malicious payloads designed to attempt database compromise:
1. **Invalid ID Injection**: Creating a document with ID `../../hack-id` or extreme lengths trying to poisoning paths.
2. **Missing required properties**: Document lacking a `name` or lacking a `faceImageURL`.
3. **Empty values**: Creating a person with `name` as an empty string `""`.
4. **Incorrect type injection**: Sending `name` as a boolean `true` or an array instead of string.
5. **Denial of Wallet payload**: Injecting a 5MB base64 string as `faceImageURL` to exceed standard project quotas.
6. **Shadow field inject**: Sending a document containing a ghost parameter like `isAdmin: true` or `role: "owner"`.
7. **Privilege spoofing update**: Attempting to bypass validations and write into people documents without any session authentication token.
8. **Malicious character injection**: Injecting special scripts or html inside `name` (e.g. `<script>alert(1)</script>`).
9. **Null byte poisoning**: Person name including string terminating null bytes like `\u0000`.
10. **State Shortcutting / Key overwrite**: Changing immutable values or trying to mass overwrite.
11. **Malicious array injection**: Setting `faceImageURL` to an array attempting to break client list parsing.
12. **Foreign key spoof**: Referencing unrelated or non-existent document path values.

## 3. Test Runner Definition (`firestore.rules.test.ts`)
A dedicated test script verifies that all "Dirty Dozen" payloads fail with `PERMISSION_DENIED` errors on both document creation and document updates.
