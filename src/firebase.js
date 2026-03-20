import { initializeApp } from "firebase/app"
import { getMessaging } from "firebase/messaging"

const firebaseConfig = {
  apiKey: "AIzaSyBWCxYER8hgbvTN8sr6pvMFyD0TC1H21HY",
  authDomain: "scoops-app-63e2a.firebaseapp.com",
  projectId: "scoops-app-63e2a",
  storageBucket: "scoops-app-63e2a.firebasestorage.app",
  messagingSenderId: "99463085090",
  appId: "1:99463085090:web:539c81f36ce17a478dde7b",
}

const app = initializeApp(firebaseConfig)

// Guard to avoid hard-crashing in environments where messaging isn't supported.
// (e.g. some SSR/test runners)
let messaging = null
try {
  messaging = getMessaging(app)
} catch (e) {
  messaging = null
}

export { messaging }
export default app

