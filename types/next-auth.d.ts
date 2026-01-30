import 'next-auth'

declare module 'next-auth' {
  interface User {
    plan: string
  }

  interface Session {
    user: {
      id: string
      email: string
      plan: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    plan: string
  }
}

