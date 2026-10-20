type BrandLogoProps = {
  className?: string
  /** Background colour of the rounded square. */
  color?: string
}

/** Rounded green square with a white four-point sparkle. Size it via className. */
export default function BrandLogo({ className, color = '#1a6a5b' }: BrandLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="100" height="100" rx="24" fill={color} />
      <path
        fill="#fff"
        d="M50 18C50 32 68 50 82 50C68 50 50 68 50 82C50 68 32 50 18 50C32 50 50 32 50 18Z"
      />
    </svg>
  )
}
