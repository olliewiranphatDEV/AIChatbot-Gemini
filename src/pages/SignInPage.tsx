import BackgroundShapes from '../components/BackgroundShapes.tsx'
import BrandLogo from '../components/BrandLogo.tsx'
import ConversationPreview from '../components/ConversationPreview.tsx'
import GoogleSignInButton from '../components/GoogleSignInButton.tsx'

export default function SignInPage() {
  // Placeholder: Firebase Authentication (Google provider) will be wired in here later.
  const onGoogleSignIn = () => {}

  return (
    <main className="flex min-h-screen flex-col text-[#06090d] lg:h-screen lg:min-h-[64rem] lg:flex-row">
      <section className="relative isolate flex flex-col overflow-hidden bg-[#ebf3ee] px-[1.5rem] pt-[1.6875rem] pb-[3rem] lg:w-[56.25%] lg:px-[3.0625rem] lg:pb-0">
        <BackgroundShapes />

        <div className="flex items-center gap-[1.125rem]">
          <BrandLogo className="size-[2.5rem]" />
          <span className="relative -top-[0.09rem] text-[1.625rem] leading-none font-semibold">AI Chat</span>
        </div>

        <div className="mt-[3.5rem] lg:mt-[8.3125rem]">
          <h1 className="text-[2.75rem] leading-[1.162] font-bold tracking-[-0.037em] text-[#050505] sm:text-[4rem] lg:text-[4.25rem] lg:whitespace-nowrap">
            A little clarity.
            <br />
            One conversation away.
          </h1>
          <p className="mt-[1.5rem] text-[1.375rem] text-[#535c56] sm:text-[1.75rem] lg:mt-[1.0625rem] lg:text-[2.08rem]">
            Think, write, and explore with AI.
          </p>
        </div>

        <div className="mt-[2.5rem] lg:mt-auto lg:mb-[10.125rem] lg:ml-[5rem]">
          <ConversationPreview />
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-white px-[1.5rem] py-[4rem] lg:pt-0 lg:pb-[2rem]">
        <div className="flex w-full max-w-[28.375rem] flex-col items-center text-center">
          <BrandLogo className="size-[5.125rem]" />
          <h2 className="mt-[2.0625rem] text-[2.25rem] leading-[1.15] font-bold tracking-[-0.044em] text-[#08101a] sm:text-[3.17rem] lg:whitespace-nowrap">
            Welcome to AI Chat
          </h2>
          <p className="mt-[0.625rem] text-[1.25rem] text-[#4b5563] sm:text-[1.6rem]">
            Sign in to start a conversation.
          </p>
          <div className="mt-[3.625rem] flex w-full justify-center">
            <GoogleSignInButton onClick={onGoogleSignIn} />
          </div>
          <p className="mt-[2.0625rem] text-[1rem] text-[#6b7280] sm:text-[1.08rem]">
            New here? Your account is created when you sign in.
          </p>
        </div>
      </section>
    </main>
  )
}
