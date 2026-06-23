export {}

// Create a type for the roles
export type Roles = 'admin' | 'head' | 'user'

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles,
      onCompleteSetup?: boolean,
      companyName: string,
    }
  }
}