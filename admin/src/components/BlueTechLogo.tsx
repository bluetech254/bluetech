export default function BlueTechLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Circuit board pattern background */}
      <circle cx="50" cy="50" r="48" fill="url(#logo-gradient)" />
      
      {/* Letter "B" with tech elements */}
      <path 
        d="M 30 25 L 30 75 L 55 75 C 65 75 70 70 70 62.5 C 70 57.5 67 52.5 60 50 C 67 47.5 70 42.5 70 37.5 C 70 30 65 25 55 25 Z M 40 35 L 52 35 C 57 35 60 37 60 40 C 60 43 57 45 52 45 L 40 45 Z M 40 52 L 55 52 C 60 52 63 54.5 63 58.5 C 63 62.5 60 65 55 65 L 40 65 Z"
        fill="white"
      />
      
      {/* Tech circuit nodes */}
      <circle cx="22" cy="50" r="3" fill="white" opacity="0.8" />
      <circle cx="78" cy="35" r="2.5" fill="white" opacity="0.7" />
      <circle cx="75" cy="65" r="2.5" fill="white" opacity="0.7" />
      
      {/* Circuit lines */}
      <line x1="22" y1="50" x2="30" y2="50" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="70" y1="37.5" x2="78" y2="35" stroke="white" strokeWidth="1.5" opacity="0.4" />
      <line x1="70" y1="62.5" x2="75" y2="65" stroke="white" strokeWidth="1.5" opacity="0.4" />
      
      {/* Gradient definition */}
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
    </svg>
  );
}
