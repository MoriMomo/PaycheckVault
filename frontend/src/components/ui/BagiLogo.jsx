export default function BagiLogo({ className = 'h-6 w-6' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      {/* Back, legs, belly, and trunk tip */}
      <path
        d="M15 62 C15 44 24 32 37 28"
        stroke="#9929EA"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 50 L25 76 H37 L38 64 C44 65 49 64 54 61 L55 76 H67 L66 56 C70 61 74 68 74 71 C74 76 78 78 82 76 C85 74 86 70 86 64 V42 C86 30 78 24 66 24 H44 C41 34 42 48 53 56 C59 50 61 44 60 39 H54"
        stroke="#FAEB92"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Tusk */}
      <path
        d="M66 52 C74 58 82 59 90 57"
        stroke="#FF5FCF"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
