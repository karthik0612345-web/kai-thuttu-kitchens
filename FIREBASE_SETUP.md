# Firebase Setup

1. Create a Firebase project in the Firebase Console.
2. Add a Web App and copy the Firebase config values.
3. Create `.env.local` in this project using `firebase.env.example` as the template.
4. Enable Authentication providers in Firebase Console.
5. Create a Cloud Firestore database.

The app initializes Firebase from `lib/firebase.ts`.

Exports:
- `firebaseApp`
- `db`
- `auth`
- `googleProvider`
- `isFirebaseConfigured`

Firestore:
- Checkout writes customer orders to the `orders` collection through `createOrder` in `lib/firestore.ts`.
- Each order uses a generated document ID such as `KTK-MABC123-XYZ789`.
- Saved order fields include `orderId`, `customerDetails`, `orderedItems`, `paymentMethod`, `total`, `status`, `paymentStatus`, `orderTimestamp`, `createdAt`, and `updatedAt`.

Authentication:
- `AuthProvider` exposes Firebase auth state and Google sign-in/sign-out helpers.
- Admin login uses Firebase Email/Password Authentication.
- Enable Email/Password sign-in in Firebase Console.
- Add admin users in Firebase Authentication.
- Add admin account emails to `NEXT_PUBLIC_ADMIN_EMAILS` as a comma-separated list.
- Admin UI routes are protected by Firebase auth state and the admin email allowlist.
- For production, enforce admin-only reads/writes in Firestore Security Rules or custom claims.

Required environment variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_ADMIN_EMAILS`
