/**
 * Google Authentication & Identity Services (GIS) Service
 * Handles official Google OAuth 2.0 Identity Services (GIS) with JWT credential decoding,
 * official Google button rendering, One Tap prompt, and persistent user profile management.
 */

export interface GoogleUserProfile {
  sub: string;
  name: string;
  email: string;
  picture?: string;
  emailVerified?: boolean;
}

const GOOGLE_USER_KEY = 'polyrich_google_user';
const GOOGLE_CLIENT_ID_KEY = 'polyrich_google_client_id';

// Default / fallback Client ID (can be overridden via VITE_GOOGLE_CLIENT_ID or in-app settings)
const DEFAULT_CLIENT_ID = ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string) || '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (notification?: (notification: any) => void) => void;
          disableAutoSelect: () => void;
          revoke: (hint: string, done: () => void) => void;
        };
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

/**
 * Decodes a base64url-encoded Google ID token (JWT)
 */
export function decodeGoogleJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to parse Google JWT:', err);
    return null;
  }
}

export const googleAuth = {
  /**
   * Get active Google Client ID (from settings or env)
   */
  getClientId(): string {
    return localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || DEFAULT_CLIENT_ID;
  },

  /**
   * Save custom Google Client ID
   */
  setClientId(clientId: string): void {
    if (clientId.trim()) {
      localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId.trim());
    } else {
      localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
    }
  },

  /**
   * Get stored Google user profile
   */
  getStoredUser(): GoogleUserProfile | null {
    try {
      const stored = localStorage.getItem(GOOGLE_USER_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  /**
   * Save Google user profile to localStorage
   */
  saveUser(profile: GoogleUserProfile): void {
    localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(profile));
  },

  /**
   * Clear user profile and sign out
   */
  signOut(): void {
    localStorage.removeItem(GOOGLE_USER_KEY);
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  },

  /**
   * Connect direct Google account (when using real Google email address)
   */
  connectDirect(name: string, email: string, customPicture?: string): GoogleUserProfile {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || cleanEmail.split('@')[0];
    const picture = customPicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=4338ca,6366f1,3b82f6`;
    
    // Stable pseudo-sub generated from email
    let hash = 0;
    for (let i = 0; i < cleanEmail.length; i++) {
      hash = (hash << 5) - hash + cleanEmail.charCodeAt(i);
      hash |= 0;
    }
    const sub = `g-${Math.abs(hash)}`;

    const profile: GoogleUserProfile = {
      sub,
      name: cleanName,
      email: cleanEmail,
      picture,
      emailVerified: true
    };

    this.saveUser(profile);
    return profile;
  },

  /**
   * Initialize Google Identity Services
   */
  initializeGIS(onSuccess: (profile: GoogleUserProfile) => void): boolean {
    if (!window.google?.accounts?.id) {
      return false;
    }

    const clientId = this.getClientId();
    if (!clientId) {
      return false;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response?.credential) {
            const decoded = decodeGoogleJwt(response.credential);
            if (decoded) {
              const profile: GoogleUserProfile = {
                sub: decoded.sub,
                name: decoded.name || decoded.email.split('@')[0],
                email: decoded.email,
                picture: decoded.picture,
                emailVerified: decoded.email_verified
              };
              this.saveUser(profile);
              onSuccess(profile);
            }
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });
      return true;
    } catch (err) {
      console.warn('Google Identity Services initialization warning:', err);
      return false;
    }
  },

  /**
   * Render the official Google Sign-In button into an HTML element
   */
  renderButton(
    container: HTMLElement,
    onSuccess: (profile: GoogleUserProfile) => void,
    options?: { theme?: 'outline' | 'filled_blue' | 'filled_black'; size?: 'large' | 'medium' | 'small'; text?: 'signin_with' | 'signup_with' | 'continue_with'; width?: number }
  ): boolean {
    if (!this.initializeGIS(onSuccess) || !window.google?.accounts?.id) {
      return false;
    }

    try {
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: options?.theme || 'outline',
        size: options?.size || 'large',
        text: options?.text || 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: options?.width || 250
      });
      return true;
    } catch (err) {
      console.warn('Could not render Google Button:', err);
      return false;
    }
  },

  /**
   * Trigger Google One Tap account picker prompt
   */
  promptOneTap(onSuccess: (profile: GoogleUserProfile) => void): void {
    if (this.initializeGIS(onSuccess) && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  }
};
