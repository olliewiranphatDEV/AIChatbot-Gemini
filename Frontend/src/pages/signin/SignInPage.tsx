import { typography } from '../../styles/typography.ts'
import BackgroundShapes from '../../components/signin/BackgroundShapes.tsx'
import BrandLogo from '../../components/shared/BrandLogo.tsx'
import ConversationPreview from '../../components/signin/ConversationPreview.tsx'
import GoogleSignInButton from '../../components/signin/GoogleSignInButton.tsx'

type SignInPageProps = {
  onGoogleSignIn: () => void
  onGuest: () => void
  busy: boolean
  error: string | null
}

export default function SignInPage({ onGoogleSignIn, onGuest, busy, error }: SignInPageProps) {

  return (
    <main className="fluid-rem flex min-h-dvh flex-col text-ink desk:h-screen desk:min-h-[64rem] desk:flex-row">
      <section className="relative isolate flex flex-col overflow-hidden bg-hero px-[1.25rem] pt-[clamp(1rem,2.5dvh,1.5rem)] pb-[clamp(1rem,3dvh,2.5rem)] sm:px-[2rem] desk:w-[56.25%] desk:px-[3.0625rem] desk:pt-[1.6875rem] desk:pb-0">
        <BackgroundShapes />

        <div className="flex items-center gap-[0.75rem] desk:gap-[1.125rem]">
          <BrandLogo className="size-[2.25rem] desk:size-[2.5rem]" />
          <span className={`${typography.brand} relative -top-[0.02rem]`}>
            AI Chat
          </span>
        </div>

        <div className="mt-[clamp(0.75rem,3dvh,2.25rem)] sm:mt-[clamp(1rem,4dvh,3.5rem)] desk:mt-[8.25rem]">
          <h1 className={`${typography.display} text-ink desk:whitespace-nowrap`}>
            A little clarity.
            <br />
            One conversation away.
          </h1>
          <p className={`${typography.displaySubtitle} mt-[0.75rem] text-ink-2 sm:mt-[1rem] desk:mt-[1rem]`}>
            Think, write, and explore with AI.
          </p>
        </div>

        <div className="mt-[clamp(0.75rem,3dvh,2.5rem)] sm:mt-[clamp(1rem,3dvh,2.5rem)] desk:mt-[5.6875rem] desk:ml-[5rem] hidden [@media(min-height:840px)_and_(max-width:639px)]:block [@media(min-height:1130px)_and_(min-width:640px)]:block desk:block">
          <ConversationPreview />
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-panel px-[1.25rem] py-[clamp(1rem,4dvh,3rem)] sm:py-[clamp(1.5rem,5dvh,4rem)] desk:pt-0 desk:pb-[1.75rem]">
        <div className="relative flex w-full max-w-[28.375rem] flex-col items-center text-center">
          <BrandLogo className="size-[clamp(2.5rem,7dvh,4rem)] sm:size-[clamp(3.5rem,8dvh,5.125rem)] desk:size-[5.125rem]" />
          <h2 className={`${typography.title} mt-[clamp(0.75rem,2dvh,1.25rem)] text-ink sm:mt-[clamp(1rem,3dvh,2.0625rem)] desk:mt-[2.0625rem] desk:whitespace-nowrap`}>
            Welcome to AI Chat
          </h2>
          <p className={`${typography.subtitle} mt-[0.625rem] text-ink-2`}>
            Sign in to start a conversation.
          </p>
          <div className="mt-[clamp(1rem,3dvh,2rem)] flex w-full justify-center sm:mt-[clamp(1.25rem,4dvh,3.4375rem)] desk:mt-[3.4375rem]">
            <GoogleSignInButton onClick={onGoogleSignIn} busy={busy} />
          </div>
          <p className={`${typography.description} mt-[clamp(0.75rem,2dvh,1.25rem)] text-muted sm:mt-[clamp(1rem,3dvh,2.0625rem)] desk:mt-[2.0625rem]`}>
            New here? Your account is created when you sign in.
          </p>
          <div className="mt-5 flex w-full flex-col items-center sm:mt-6 desk:absolute desk:inset-x-0 desk:top-full">
            <button
              type="button"
              onClick={onGuest}
              disabled={busy}
              className={`${typography.button} flex h-[3.5rem] w-full max-w-[10rem] cursor-pointer items-center justify-center rounded-[0.625rem] border border-brand-alt bg-panel px-6 text-brand-alt transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-alt disabled:cursor-wait disabled:opacity-60`}
            >
              Guest
            </button>
            {error && <p role="alert" className={`${typography.description} mt-3 w-full text-danger`}>{error}</p>}
          </div>
        </div>
      </section>
    </main>
  )
}
