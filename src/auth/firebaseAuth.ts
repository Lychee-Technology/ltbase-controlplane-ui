import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import type { FirebaseAuthProviderConfig } from '../types';
import type { ExternalAuthProvider } from './providers';

export function createFirebaseAuthProvider(config: FirebaseAuthProviderConfig): ExternalAuthProvider {
  const app = initializeApp(
    {
      apiKey: config.firebaseApiKey,
      authDomain: `${config.firebaseProjectId}.firebaseapp.com`,
    },
    `ltbase-controlplane-${config.name}`,
  );
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  return {
    async signIn() {
      const result = await signInWithPopup(auth, provider);
      return {
        type: 'token',
        externalToken: await result.user.getIdToken(true),
        subjectLabel: result.user.email ?? result.user.uid,
      };
    },
    async signOut() {
      await signOut(auth);
    },
  };
}
