# CaOZi — Store release checklist

The source tree is configured for App Store and Google Play release builds. Complete these environment and console steps before submission.

## Backend

- Deploy `firestore.rules` to the production Firebase project: `firebase deploy --only firestore:rules`.
- Confirm Email/Password authentication is enabled.
- Test sign-up, sign-in, team invite, report/block, and in-app account deletion against production.
- Assign a person to review documents in the `reports` collection and publish a support contact.

## Public URLs

- Host `developer-web/privacy-policy.html`, `terms.html`, and `delete-account.html` over HTTPS.
- Replace the placeholder contact wording with the developer's real support email.
- Put the privacy URL in both stores and the deletion URL in Google Play's Data safety form.

## Store declarations

- App Store privacy: declare account identifiers, user content, and app functionality data used by Firebase; no advertising tracking.
- Google Play Data safety: declare email/account data, user-generated tasks/team data, encryption in transit, and user-requested deletion.
- Google Play App content: complete the foreground-service and overlay-permission declarations for the optional floating Pet feature.
- Provide reviewer credentials and instructions for team, report/block, deletion, and floating Pet flows.

## Release artifacts

- Add the EAS project ID and production signing credentials to the correct Expo account.
- Keep the permanent identifiers `com.robotpet.manager` only if they are owned by this developer account; identifiers cannot be changed after release.
- Build with `eas build --platform all --profile production`, test the signed artifacts, then submit.
