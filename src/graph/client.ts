// Singleton do MSAL + Graph Client com custom auth provider

import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  type Configuration,
} from '@azure/msal-browser'
import { Client } from '@microsoft/microsoft-graph-client'

const CLIENT_ID = import.meta.env.VITE_GRAPH_CLIENT_ID

// Scopes requisitados no login e para o Graph Client
export const LOGIN_SCOPES = [
  'Files.ReadWrite.All',
  'User.Read',
  'Sites.ReadWrite.All',
  'offline_access',
]

const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: import.meta.env.VITE_MSAL_AUTHORITY || `https://login.microsoftonline.com/common`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
}

// Instância única do MSAL — usada tanto pelo MsalProvider quanto pelas funções Graph
export const msalInstance = new PublicClientApplication(msalConfig)

let _graphClient: Client | null = null

// Retorna o Graph Client inicializado. Cria apenas uma vez.
export function getGraphClient(): Client {
  if (_graphClient) return _graphClient

  _graphClient = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async (): Promise<string> => {
        const accounts = msalInstance.getAllAccounts()
        if (accounts.length === 0) {
          throw new Error('Nenhuma conta autenticada. Faça login primeiro.')
        }

        try {
          const result = await msalInstance.acquireTokenSilent({
            scopes: LOGIN_SCOPES,
            account: accounts[0],
          })
          return result.accessToken
        } catch (err) {
          // Token expirado ou exige interação — tenta popup
          if (err instanceof InteractionRequiredAuthError) {
            const result = await msalInstance.acquireTokenPopup({
              scopes: LOGIN_SCOPES,
            })
            return result.accessToken
          }
          throw err
        }
      },
    },
  })

  return _graphClient
}

// Descarta o cliente cacheado (necessário após logout)
export function resetGraphClient() {
  _graphClient = null
}
