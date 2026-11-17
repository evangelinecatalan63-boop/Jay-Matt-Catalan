export function createHousematePortraitSvg(params: {
  initials: string;
  accent: string;
  secondary: string;
  skinTone: string;
  hairStyle: 'short' | 'wavy' | 'bob' | 'fade' | 'bun';
  hairColor: string;
}): string {
  const { initials, accent, secondary, skinTone, hairStyle, hairColor } = params;

  const hairBack =
    hairStyle === 'wavy'
      ? `<path d="M132 150 C124 225, 134 275, 152 290 L248 290 C266 275, 276 225, 268 150 C260 100, 140 100, 132 150 Z" fill="${hairColor}"/>`
      : hairStyle === 'bob'
      ? `<path d="M138 145 C130 205, 138 242, 156 248 L244 248 C262 242, 270 205, 262 145 C255 102, 145 102, 138 145 Z" fill="${hairColor}"/>`
      : hairStyle === 'bun'
      ? `<circle cx="200" cy="92" r="24" fill="${hairColor}"/><path d="M142 152 C140 112, 260 112, 258 152 Z" fill="${hairColor}"/>`
      : '';

  const hairFront =
    hairStyle === 'fade'
      ? `<path d="M150 156 C150 112, 250 112, 250 156 C236 138, 164 138, 150 156 Z" fill="${hairColor}"/>`
      : hairStyle === 'short'
      ? `<path d="M146 164 C144 106, 256 106, 254 164 C236 132, 195 130, 175 144 C162 150, 154 156, 146 164 Z" fill="${hairColor}"/>`
      : `<path d="M145 165 C148 110, 252 110, 255 165 C235 134, 196 138, 174 148 C162 153, 153 158, 145 165 Z" fill="${hairColor}"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="400" height="480">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0D0D12"/>
        <stop offset="55%" stop-color="${secondary}"/>
        <stop offset="100%" stop-color="#09090B"/>
      </linearGradient>
      <radialGradient id="rim" cx="50%" cy="32%" r="55%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.48"/>
        <stop offset="70%" stop-color="${accent}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="suit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#22222B"/>
        <stop offset="100%" stop-color="#0F0F14"/>
      </linearGradient>
    </defs>
    <rect width="400" height="480" fill="url(#bg)"/>
    <rect width="400" height="480" fill="url(#rim)"/>
    <circle cx="200" cy="186" r="136" fill="none" stroke="${accent}" stroke-opacity="0.22" stroke-width="1.5"/>
    <circle cx="200" cy="186" r="168" fill="none" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1"/>
    ${hairBack}
    <path d="M98 480 C102 360, 138 308, 200 308 C262 308, 298 360, 302 480 Z" fill="url(#suit)"/>
    <path d="M168 314 L200 358 L232 314" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.7"/>
    <rect x="178" y="254" width="44" height="62" rx="18" fill="${skinTone}"/>
    <ellipse cx="200" cy="196" rx="52" ry="64" fill="${skinTone}"/>
    ${hairFront}
    <circle cx="180" cy="194" r="3.5" fill="#18181B"/>
    <circle cx="220" cy="194" r="3.5" fill="#18181B"/>
    <path d="M188 225 Q200 233 212 225" fill="none" stroke="#7C3F34" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="24" y="424" width="56" height="30" rx="4" fill="#09090B" fill-opacity="0.72" stroke="${accent}" stroke-opacity="0.45"/>
    <text x="52" y="444" text-anchor="middle" fill="#F4F4F5" font-family="system-ui, sans-serif" font-size="13" font-weight="700" letter-spacing="2">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createEditorialCoverSvg(params: {
  title: string;
  accent: string;
  theme: 'studio' | 'nomination' | 'challenge' | 'eviction' | 'spotlight';
}): string {
  const { title, accent, theme } = params;
  const shapes =
    theme === 'nomination'
      ? `<circle cx="520" cy="220" r="140" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.45"/><circle cx="520" cy="220" r="90" fill="${accent}" fill-opacity="0.12"/><line x1="80" y1="360" x2="720" y2="80" stroke="#DC2626" stroke-width="1.5" stroke-opacity="0.35"/>`
      : theme === 'challenge'
      ? `<polygon points="560,70 700,340 420,340" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.4"/><polygon points="560,120 655,310 465,310" fill="${accent}" fill-opacity="0.1"/>`
      : theme === 'eviction'
      ? `<rect x="440" y="70" width="220" height="300" fill="none" stroke="#DC2626" stroke-width="2" stroke-opacity="0.5"/><line x1="550" y1="70" x2="550" y2="370" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.35"/>`
      : `<circle cx="580" cy="210" r="150" fill="${accent}" fill-opacity="0.09"/><circle cx="580" cy="210" r="105" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.45"/><rect x="80" y="90" width="260" height="2" fill="${accent}" fill-opacity="0.5"/>`;

  const cleanLabel = title.replace(/[<>&'"]/g, '').slice(0, 38);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#09090B"/>
        <stop offset="50%" stop-color="#14141A"/>
        <stop offset="100%" stop-color="#09090B"/>
      </linearGradient>
      <radialGradient id="glow" cx="72%" cy="45%" r="52%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="800" height="450" fill="url(#bg)"/>
    <rect width="800" height="450" fill="url(#glow)"/>
    <g opacity="0.25" stroke="#FFFFFF" stroke-width="0.5">
      <line x1="0" y1="150" x2="800" y2="150"/>
      <line x1="0" y1="300" x2="800" y2="300"/>
      <line x1="266" y1="0" x2="266" y2="450"/>
      <line x1="533" y1="0" x2="533" y2="450"/>
    </g>
    ${shapes}
    <text x="64" y="388" fill="#A1A1AA" font-family="system-ui, sans-serif" font-size="14" font-weight="600" letter-spacing="3">${cleanLabel.toUpperCase()}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function compressImageFile(file: File, maxDim = 800, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file format.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
