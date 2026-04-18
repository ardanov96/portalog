export type CurrentUser = {
  id: string
  name: string
  email: string
  role: string
  phone?: string | null
  avatarUrl?: string | null
  organizationId: string
  organization: {
    id: string
    name: string
    slug: string
    logoUrl?: string | null
  }
}