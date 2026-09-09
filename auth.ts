import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const admins = () => (process.env.ADMIN_EMAILS ?? "").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
export const isAdmin = (email?: string | null) => !!email && admins().includes(email.toLowerCase());

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) { return account?.provider === "google" && isAdmin(user.email); },
  },
});
