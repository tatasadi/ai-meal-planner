import { Configuration, PopupRequest } from '@azure/msal-browser'

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || '',
    authority: process.env.NEXT_PUBLIC_AZURE_AD_AUTHORITY || '',
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || '/',
    postLogoutRedirectUri: process.env.NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI || '/',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    allowNativeBroker: false,
  },
}

export const loginRequest: PopupRequest = {
  scopes: ['openid', 'profile', 'User.Read'],
}

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
}