/**
 * Monochrome equipment visual for small fitness-dashboard hero surfaces.
 * Lightweight vector shading instead of a runtime 3D canvas/texture.
 * Decoration only: no dynamic nutrition or training state is inferred.
 */
export function FitnessEquipmentVisual() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 220 145"
      xmlns="http://www.w3.org/2000/svg" className="jfs3-equipment-art">
      <defs>
        <linearGradient id="jfs3-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d8d90"/>
          <stop offset=".12" stopColor="#f5f5f6"/>
          <stop offset=".29" stopColor="#9c9ca1"/>
          <stop offset=".54" stopColor="#3b3b40"/>
          <stop offset=".78" stopColor="#b3b3b7"/>
          <stop offset="1" stopColor="#2c2c30"/>
        </linearGradient>
        <linearGradient id="jfs3-weight" x1="0" y1="0" x2="1" y2=".2">
          <stop offset="0" stopColor="#101012"/>
          <stop offset=".27" stopColor="#545459"/>
          <stop offset=".52" stopColor="#27272b"/>
          <stop offset=".85" stopColor="#070709"/>
          <stop offset="1" stopColor="#4b4b50"/>
        </linearGradient>
        <linearGradient id="jfs3-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0b0b0d"/>
          <stop offset=".55" stopColor="#65656a"/>
          <stop offset=".9" stopColor="#19191b"/>
          <stop offset="1" stopColor="#060608"/>
        </linearGradient>
        <radialGradient id="jfs3-face" cx="39%" cy="27%" r="78%">
          <stop offset="0" stopColor="#737378"/>
          <stop offset=".18" stopColor="#38383c"/>
          <stop offset=".75" stopColor="#161618"/>
          <stop offset="1" stopColor="#09090b"/>
        </radialGradient>
        <filter id="jfs3-soft-shadow" x="-35%" y="-70%" width="170%" height="240%">
          <feGaussianBlur stdDeviation="7"/>
        </filter>
      </defs>
      <ellipse cx="110" cy="125" rx="86" ry="9" fill="#000" opacity=".13"
        filter="url(#jfs3-soft-shadow)"/>
      <g transform="translate(1 0) rotate(-16 110 69)">
        <rect x="30" y="60" width="166" height="19" rx="4" fill="url(#jfs3-metal)"/>
        <path d="M58 63 H161" stroke="#fff" strokeOpacity=".37" strokeWidth="2" strokeLinecap="round"/>
        <path d="M59 76 H161" stroke="#000" strokeOpacity=".38" strokeWidth="2" strokeLinecap="round"/>
        <rect x="18" y="39" width="35" height="61" rx="11" fill="url(#jfs3-rim)"
          stroke="#101014" strokeWidth="2"/>
        <rect x="28" y="36" width="22" height="67" rx="9" fill="url(#jfs3-weight)"
          stroke="#19191c" strokeWidth="1.5"/>
        <ellipse cx="29" cy="69" rx="10" ry="30" fill="url(#jfs3-face)"
          stroke="#6a6a6e" strokeWidth="1"/>
        <ellipse cx="29" cy="69" rx="6" ry="22" fill="none" stroke="#7f7f84"
          strokeOpacity=".45" strokeWidth="1.4"/>
        <ellipse cx="29" cy="69" rx="2.5" ry="9" fill="#0b0b0d" stroke="#67676a" strokeWidth=".9"/>
        <rect x="162" y="39" width="33" height="61" rx="10" fill="url(#jfs3-rim)"
          stroke="#101014" strokeWidth="2"/>
        <rect x="170" y="36" width="23" height="68" rx="9" fill="url(#jfs3-weight)"
          stroke="#101014" strokeWidth="1.5"/>
        <ellipse cx="190" cy="70" rx="11" ry="33" fill="url(#jfs3-face)"
          stroke="#747479" strokeWidth="1.2"/>
        <ellipse cx="190" cy="70" rx="7.8" ry="25" fill="none"
          stroke="#737378" strokeOpacity=".6" strokeWidth="2"/>
        <ellipse cx="190" cy="70" rx="3.5" ry="12" fill="#161619"
          stroke="#7b7b7f" strokeWidth="1"/>
        <path d="M174 45 C180 39 188 39 193 45" fill="none"
          stroke="#fff" strokeOpacity=".2" strokeWidth="2"/>
      </g>
    </svg>
  );
}
