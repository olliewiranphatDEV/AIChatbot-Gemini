import { typography } from '../../styles/typography.ts'
import { MenuIcon } from '../../components/chat/icons.tsx'
import ThemeSelector from '../../components/settings/ThemeSelector.tsx'
import type { ThemePreference } from '../../components/settings/ThemeSelector.tsx'
import { GoogleLogo } from '../../components/signin/GoogleSignInButton.tsx'
import type { ChatUser } from '../../types/chat.ts'

const cardClassName = 'settings-card rounded-[0.6875rem] border border-[#dfe3e0] bg-white'

type SettingsPageProps = {
  user: ChatUser
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
  onLogout?: () => void
  sidebarOpen: boolean
  onOpenSidebar: () => void
  onBackToChat: () => void
}

export default function SettingsPage({ user, theme, onThemeChange, onLogout, sidebarOpen, onOpenSidebar, onBackToChat }: SettingsPageProps) {
  return (
    <main className="settings-main relative min-w-0 flex-1 overflow-y-auto bg-[#f9f9f7] text-[#071015]">
      <div className="settings-navigation flex items-center justify-between px-4 pt-4 sm:px-8 desk:absolute desk:top-[1.9375rem] desk:right-8 desk:p-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          aria-controls="chat-sidebar"
          aria-expanded={sidebarOpen}
          className="flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-brand desk:hidden"
        >
          <MenuIcon className="size-6" />
        </button>
        <button type="button" onClick={onBackToChat} className={`${typography.label} flex min-h-8 cursor-pointer items-center gap-3 rounded text-[#5e676b] hover:text-[#147764] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand`}>
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d="M21 12H3m7-7-7 7 7 7" /></svg>
          Back to chat
        </button>
      </div>

      <div className="settings-content mx-auto w-full max-w-[75.375rem] px-5 pt-6 pb-[max(2.75rem,env(safe-area-inset-bottom))] sm:px-10 sm:pt-8 desk:px-[5.5rem] desk:pt-[5.1875rem] desk:pr-[5.75rem]">
        <h1 className={typography.title}>Settings</h1>
        <p className={`${typography.subtitle} mt-[0.375rem] text-[#5e676b]`}>Make AI Chat feel like your space.</p>

        <section aria-labelledby="account-heading" className="mt-7 sm:mt-9 desk:mt-[2.3125rem]">
          <h2 id="account-heading" className={typography.header}>Account</h2>
          <div className={`${cardClassName} mt-[0.8125rem] flex min-w-0 items-center gap-4 px-4 py-5 sm:gap-[1.875rem] sm:px-5 sm:py-6 desk:min-h-[9.1875rem] desk:items-start desk:px-6 desk:pt-[1.625rem] desk:pb-[1.375rem]`}>
            <span aria-hidden="true" className={`${typography.accountAvatar} flex size-14 shrink-0 items-center justify-center rounded-full bg-[#0e6256] text-white shadow-[0_2px_4px_rgb(20_50_40_/_5%)] sm:size-[5.375rem]`}>{user.name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0 desk:pt-[0.1875rem]">
              <p className={`${typography.subheading} break-words [overflow-wrap:anywhere]`}>{user.name}</p>
              <p className={`${typography.description} text-[#6b7680] [overflow-wrap:anywhere]`}>{user.email}</p>
              <span className={`${typography.badge} mt-2 flex w-fit max-w-full items-center gap-2 rounded-full bg-[#f0f2f2] px-[0.875rem] py-1 text-[#626e75]`}>
                <GoogleLogo className="size-[1.0625rem] shrink-0" />
                <span>Google account</span>
              </span>
            </div>
          </div>
        </section>

        <section aria-labelledby="appearance-heading" className="mt-8 desk:mt-[2.4375rem]">
          <h2 id="appearance-heading" className={typography.header}>Appearance</h2>
          <div className={`${cardClassName} @container mt-[0.8125rem] px-5 pt-[1.375rem] pb-[1.625rem] desk:pl-[1.625rem] desk:pr-[1.5rem]`}>
            <h3 className={typography.subheading}>Theme</h3>
            <p id="theme-description" className={`${typography.description} mb-[0.75rem] text-[#6b7680]`}>Choose how AI Chat looks.</p>
            <ThemeSelector value={theme} onThemeChange={onThemeChange} />
          </div>
        </section>

        <section aria-labelledby="session-heading" className="mt-8 desk:mt-[2.1875rem]">
          <h2 id="session-heading" className={typography.header}>Session</h2>
          <div className={`${cardClassName} mt-[0.8125rem] flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-4 px-5 py-[1.3125rem] desk:min-h-[6.3125rem] desk:pr-[1.3125rem] desk:pl-[1.625rem]`}>
            <div className="min-w-0">
              <h3 className={`${typography.subheading} break-words`}>Signed in with Google</h3>
              <p className={`${typography.description} mt-[0.125rem] text-[#6b7680]`}>Log out on this device.</p>
            </div>
            <button type="button" onClick={() => onLogout?.()} className={`${typography.button} flex h-[2.9375rem] w-[6.875rem] shrink-0 cursor-pointer items-center justify-center rounded-[0.625rem] border border-[#b71923] text-[#b71923] shadow-[0_1px_3px_rgba(90,20,20,0.05)] hover:bg-[#fff6f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b71923] desk:-translate-y-[0.1875rem]`}>Log out</button>
          </div>
        </section>
      </div>
    </main>
  )
}
