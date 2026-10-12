import BackgroundShapes from '../components/BackgroundShapes.tsx'
import BrandLogo from '../components/BrandLogo.tsx'
import ConversationPreview from '../components/ConversationPreview.tsx'
import GoogleSignInButton from '../components/GoogleSignInButton.tsx'

// Below lg, text sizes use clamp(min, vw, max) so they follow the screen width;
// from lg up the fixed rem values apply (rem itself scales with the viewport).
export default function SignInPage() {
  // Placeholder: Firebase Authentication (Google provider) will be wired in here later.
  const onGoogleSignIn = () => {}

  return (
    <main className="flex min-h-screen flex-col text-[#06090d] lg:h-screen lg:min-h-[64rem] lg:flex-row">
      <section className="relative isolate flex flex-col overflow-hidden bg-[#ebf3ee] px-[1.25rem] pt-[1.5rem] pb-[2.5rem] sm:px-[2rem] lg:w-[56.25%] lg:px-[3.0625rem] lg:pt-[1.6875rem] lg:pb-0">
        <BackgroundShapes />

        <div className="flex items-center gap-[0.75rem] lg:gap-[1.125rem]">
          <BrandLogo className="size-[2.25rem] lg:size-[2.5rem]" />
          <span className="relative -top-[0.02rem] text-[clamp(1.125rem,5vw,1.64rem)] leading-none font-semibold lg:text-[1.64rem]">
            AI Chat
          </span>
        </div>

        <div className="mt-[2.25rem] sm:mt-[3.5rem] lg:mt-[8.25rem]">
          <h1 className="text-[clamp(1.75rem,8vw,4.25rem)] leading-[1.162] font-bold tracking-[-0.025em] text-[#050505] lg:text-[4.25rem] lg:whitespace-nowrap">
            A little clarity.
            <br />
            One conversation away.
          </h1>
          <p className="mt-[0.75rem] text-[clamp(1rem,5vw,2.2375rem)] text-[#535c56] sm:mt-[1rem] lg:mt-[1rem] lg:text-[2.2375rem]">
            Think, write, and explore with AI.
          </p>
        </div>

        <div className="mt-[2rem] sm:mt-[2.5rem] lg:mt-[5.6875rem] lg:ml-[5rem]">
          <ConversationPreview />
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-white px-[1.25rem] py-[3rem] sm:py-[4rem] lg:pt-0 lg:pb-[1.75rem]">
        <div className="flex w-full max-w-[28.375rem] flex-col items-center text-center">
          <BrandLogo className="size-[4rem] sm:size-[5.125rem]" />
          <h2 className="mt-[1.25rem] text-[clamp(1.75rem,7.5vw,3.125rem)] leading-[1.15] font-bold tracking-[-0.03em] text-[#08101a] sm:mt-[2.0625rem] lg:text-[3.125rem] lg:whitespace-nowrap">
            Welcome to AI Chat
          </h2>
          <p className="mt-[0.625rem] text-[clamp(1rem,4.2vw,1.7rem)] text-[#4b5563] lg:text-[1.7rem]">
            Sign in to start a conversation.
          </p>
          <div className="mt-[2rem] flex w-full justify-center sm:mt-[3.4375rem]">
            <GoogleSignInButton onClick={onGoogleSignIn} />
          </div>
          <p className="mt-[1.25rem] text-[clamp(0.75rem,3.2vw,1.156rem)] text-[#6b7280] sm:mt-[2.0625rem] lg:text-[1.156rem]">
            New here? Your account is created when you sign in.
          </p>
        </div>
      </section>
    </main>
  )
}
