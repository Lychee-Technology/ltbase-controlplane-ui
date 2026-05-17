export interface ExternalAuthTokenResult {
  type: 'token';
  externalToken: string;
  subjectLabel?: string;
}

export interface ExternalAuthRedirectResult {
  type: 'redirect';
}

export interface ExternalAuthUnavailableResult {
  type: 'unavailable';
}

export type ExternalAuthResult = ExternalAuthTokenResult | ExternalAuthRedirectResult | ExternalAuthUnavailableResult;

export interface ExternalAuthProvider {
  signIn(options?: { allowRedirect?: boolean }): Promise<ExternalAuthResult>;
  signOut(): Promise<void>;
}
