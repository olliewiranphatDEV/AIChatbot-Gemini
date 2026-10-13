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
    <main className="fluid-rem flex min-h-screen flex-col text-[#06090d] lg:h-screen lg:min-h-[64rem] lg:flex-row">
      <section className="relative isolate flex flex-col overflow-hidden bg-[#ebf3ee] px-[1.25rem] pt-[1.5rem] pb-[2.5rem] sm:px-[2rem] lg:w-[56.25%] lg:px-[3.0625rem] lg:pt-[1.6875rem] lg:pb-0">
        <BackgroundShapes />

        <div className="flex items-center gap-[0.75rem] lg:gap-[1.125rem]">
          <BrandLogo className="size-[2.25rem] lg:size-[2.5rem]" />
          <span className={`${typography.brand} relative -top-[0.02rem]`}>
            AI Chat
          </span>
        </div>

        <div className="mt-[2.25rem] sm:mt-[3.5rem] lg:mt-[8.25rem]">
          <h1 className={`${typography.display} text-[#050505] lg:whitespace-nowrap`}>
            A little clarity.
            <br />
            One conversation away.
          </h1>
          <p className={`${typography.displaySubtitle} mt-[0.75rem] text-[#535c56] sm:mt-[1rem] lg:mt-[1rem]`}>
            Think, write, and explore with AI.
          </p>
        </div>

        <div className="mt-[2rem] sm:mt-[2.5rem] lg:mt-[5.6875rem] lg:ml-[5rem]">
          <ConversationPreview />
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-white px-[1.25rem] py-[3rem] sm:py-[4rem] lg:pt-0 lg:pb-[1.75rem]">
        <div className="relative flex w-full max-w-[28.375rem] flex-col items-center text-center">
          <BrandLogo className="size-[4rem] sm:size-[5.125rem]" />
          <h2 className={`${typography.title} mt-[1.25rem] text-[#08101a] sm:mt-[2.0625rem] lg:whitespace-nowrap`}>
            Welcome to AI Chat
          </h2>
          <p className={`${typography.subtitle} mt-[0.625rem] text-[#4b5563]`}>
            Sign in to start a conversation.
          </p>
          <div className="mt-[2rem] flex w-full justify-center sm:mt-[3.4375rem]">
            <GoogleSignInButton onClick={onGoogleSignIn} busy={busy} />
          </div>
          <p className={`${typography.description} mt-[1.25rem] text-[#6b7280] sm:mt-[2.0625rem]`}>
            New here? Your account is created when you sign in.
          </p>
          <div className="mt-5 flex w-full flex-col items-center sm:mt-6 lg:absolute lg:inset-x-0 lg:top-full">
            <button
              type="button"
              onClick={onGuest}
              disabled={busy}
              className={`${typography.button} flex h-[3.5rem] w-full max-w-[10rem] cursor-pointer items-center justify-center rounded-[0.625rem] border border-[#1A6A5B] bg-white px-6 text-[#1A6A5B] transition-colors hover:bg-[#f3f8f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60`}
            >
              Guest
            </button>
            {error && <p role="alert" className={`${typography.description} mt-3 w-full text-[#b71923]`}>{error}</p>}
          </div>
        </div>
      </section>
    </main>
  )
}
