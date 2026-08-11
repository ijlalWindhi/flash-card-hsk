import { Link, useLoaderData, useRouter } from "@tanstack/react-router"
import { logoutFn } from "@/features/accounts/auth.functions"

/**
 * The account corner of the header: a name and a way out, or a way in.
 *
 * Reads the root loader rather than taking a prop, because the header lives in
 * the shell where no route component can pass anything down.
 */
export function AccountNav() {
  const user = useLoaderData({ from: "__root__" })
  const router = useRouter()

  if (!user) {
    return (
      <Link to="/masuk" className="underline-offset-4 hover:underline">
        Masuk
      </Link>
    )
  }

  return (
    <span className="flex items-center gap-3">
      <span className="text-foreground">{user.username}</span>
      <button
        type="button"
        onClick={async () => {
          await logoutFn()
          await router.invalidate()
        }}
        className="underline-offset-4 hover:underline"
      >
        Keluar
      </button>
    </span>
  )
}
