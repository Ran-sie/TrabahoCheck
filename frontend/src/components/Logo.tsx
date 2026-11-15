/** A shield with a check mark: "verified safe". */
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <path
        d="M16 6.5 8.5 9.4v5.6c0 4.6 3 8.3 7.5 10.5 4.5-2.2 7.5-5.9 7.5-10.5V9.4L16 6.5Z"
        fill="#fff"
        fillOpacity="0.18"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m12.4 15.8 2.5 2.6 4.8-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
