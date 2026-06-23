import 'server-only';

/** Static Tauri export — no Node session; auth is Rust + client storage. */
export async function auth() {
  return {
    userId: null,
    sessionId: null,
    sessionClaims: null,
    getToken: async () => null,
    redirectToSignIn: () => {},
    protect: async () => false,
  };
}

export async function currentUser(): Promise<null> {
  return null;
}

export async function userAdmin(): Promise<never> {
  throw new Error('User admin API is not available in the desktop static build');
}
