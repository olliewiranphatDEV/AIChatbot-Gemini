/**
 * Shared typography, expressed entirely as literal Tailwind utilities.
 * Choose by text role; keep positioning, spacing, and colors in the component.
 * Chat is the reference for workspace titles and sidebar typography.
 */
const supportingText = 'text-[clamp(1rem,4vw,1.205rem)] leading-7 font-normal tracking-normal'

export const typography = {
  title: 'text-[clamp(1.25rem,5.2vw,1.75rem)] leading-[1.3] font-semibold tracking-normal lg:text-[2.15rem]',
  subtitle: supportingText,
  input: supportingText,
  header: 'text-[clamp(1.125rem,4.4vw,1.375rem)] leading-[1.4] font-semibold tracking-normal',
  subheading: 'text-[clamp(1rem,3.8vw,1.195rem)] leading-[1.5] font-semibold tracking-normal',
  description: 'text-[clamp(0.9375rem,3.8vw,1.125rem)] leading-[1.5] font-normal tracking-normal',
  body: 'text-[clamp(0.9375rem,3.8vw,1.2375rem)] leading-[1.55] font-normal tracking-normal',
  button: 'text-[1.195rem] leading-[1.5] font-medium tracking-normal',
  label: 'text-[1.12rem] leading-6 font-normal tracking-normal',
  messageAuthor: 'text-[clamp(0.9375rem,3.6vw,1.105rem)] leading-6 font-semibold tracking-normal',
  metadata: 'text-[clamp(0.8125rem,3vw,1.035rem)] leading-6 font-normal tracking-normal',
  caption: 'text-[clamp(0.75rem,2.9vw,0.915rem)] leading-[1.375rem] font-normal tracking-normal',
  status: 'text-[clamp(0.8125rem,3vw,0.95rem)] leading-[1.375rem] font-normal tracking-normal',
  compactButton: 'text-[0.84rem] leading-5 font-medium tracking-normal',
  badge: 'text-[0.875rem] leading-[1.375rem] font-normal tracking-normal sm:text-[0.9375rem]',
  // Live conversation screen
  eyebrow: 'text-[clamp(0.75rem,2.9vw,0.9rem)] leading-5 font-medium tracking-[0.14em] uppercase',
  liveHeading: 'text-[clamp(2rem,9.5vw,2.9rem)] leading-[1.1] font-bold tracking-[-0.02em] [@media(max-height:700px)]:text-[clamp(1.625rem,8vw,2.25rem)]',
  liveStatus: 'text-[clamp(1.25rem,5vw,1.75rem)] leading-[1.3] font-semibold tracking-normal',
  liveCaption: 'text-[clamp(1.0625rem,4.4vw,1.4rem)] leading-[1.45] font-normal tracking-normal',
  brand: 'text-[1.825rem] leading-none font-semibold tracking-normal',
  sidebarGroup: 'text-[1.03rem] leading-6 font-normal tracking-normal',
  sidebarHistory: 'text-[1.11rem] leading-6 font-normal tracking-normal',
  sidebarUser: 'text-[1.075rem] leading-6 font-medium tracking-normal',
  sidebarAvatar: 'text-[1.2rem] leading-none font-normal tracking-normal',
  accountAvatar: 'text-[1.75rem] leading-none font-medium tracking-normal sm:text-[2.5rem]',
  // Marketing display text has its own role, separate from workspace titles.
  display: 'text-[clamp(1.75rem,8vw,4.25rem)] leading-[1.162] font-bold tracking-[-0.025em] lg:text-[4.25rem]',
  displaySubtitle: 'text-[clamp(1rem,5vw,2.2375rem)] leading-[1.5] font-normal tracking-normal lg:text-[2.2375rem]',
} as const
