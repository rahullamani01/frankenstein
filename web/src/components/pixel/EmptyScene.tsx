import React from 'react';
import './empty-scene.css';

interface EmptySceneProps {
  title: string;
  body: string;
  hint?: string;
  /** Large ghost numerals over the clouds. */
  ghost?: string;
  action?: React.ReactNode;
  className?: string;
}

const ROCK_PATH =
  'M168 304v-22h12v-20h12v-22h12v-22h8v-24h8v-24h-8v-24h10v-26h12v-22h14v-18h14v-16h14v-14h18v-14h14v14h14v18h12v22h10v22h8v24h10v26h10v28h10v34h8v30v36z';

const SceneArt: React.FC<{ ghost: string }> = ({ ghost }) => (
  <svg
    className="px-scene-svg"
    viewBox="0 0 720 405"
    preserveAspectRatio="xMidYMid slice"
    role="presentation"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="pxSceneSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--scene-sky-a)" />
        <stop offset="0.58" stopColor="var(--scene-sky-b)" />
        <stop offset="1" stopColor="var(--scene-sky-c)" />
      </linearGradient>
      <linearGradient id="pxSceneCaption" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0c100e" stopOpacity="0" />
        <stop offset="0.4" stopColor="#0c100e" stopOpacity="0.62" />
        <stop offset="1" stopColor="#0c100e" stopOpacity="0.9" />
      </linearGradient>
      <radialGradient id="pxSceneVignette" cx="50%" cy="40%" r="74%">
        <stop offset="0.5" stopColor="#000000" stopOpacity="0" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.34" />
      </radialGradient>
      <radialGradient id="pxSceneGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="var(--scene-glow)" stopOpacity="0.8" />
        <stop offset="1" stopColor="var(--scene-glow)" stopOpacity="0" />
      </radialGradient>
      <mask id="pxSceneMoonMask">
        <rect width="720" height="405" fill="#ffffff" />
        <circle cx="100" cy="54" r="22" fill="#000000" />
      </mask>
    </defs>

    <rect width="720" height="405" fill="url(#pxSceneSky)" />

    <g className="px-scene-stars" fill="var(--scene-star)">
      <rect x="146" y="40" width="3" height="3" />
      <rect x="212" y="70" width="2" height="2" />
      <rect x="336" y="34" width="3" height="3" />
      <rect x="612" y="50" width="2" height="2" />
      <rect x="674" y="98" width="3" height="3" />
      <rect x="42" y="112" width="2" height="2" />
      <rect x="266" y="56" width="2" height="2" />
    </g>

    <circle
      cx="82"
      cy="72"
      r="25"
      fill="var(--scene-moon)"
      mask="url(#pxSceneMoonMask)"
    />

    {/* one big cumulus behind the crag, plus a small cloud far left */}
    <g transform="translate(-26 10)">
      <g className="px-scene-clouds">
        <g fill="var(--scene-cloud)">
          <rect x="248" y="185" width="324" height="80" rx="26" />
          <ellipse cx="300" cy="206" rx="58" ry="48" />
          <ellipse cx="352" cy="176" rx="62" ry="58" />
          <ellipse cx="412" cy="146" rx="66" ry="62" />
          <ellipse cx="470" cy="172" rx="58" ry="54" />
          <ellipse cx="526" cy="202" rx="52" ry="46" />
          <ellipse cx="560" cy="228" rx="38" ry="30" />
        </g>
        <g fill="var(--scene-cloud-shade)">
          <rect x="258" y="232" width="298" height="26" rx="13" opacity="0.65" />
          <ellipse cx="508" cy="214" rx="42" ry="28" opacity="0.5" />
          <ellipse cx="382" cy="238" rx="78" ry="18" opacity="0.45" />
        </g>
        <g fill="var(--scene-cloud-lit)">
          <ellipse cx="384" cy="132" rx="38" ry="22" opacity="0.8" />
          <ellipse cx="452" cy="154" rx="24" ry="14" opacity="0.55" />
        </g>
        <g fill="var(--scene-cloud)">
          <rect x="34" y="140" width="104" height="26" rx="13" />
          <ellipse cx="68" cy="142" rx="38" ry="24" />
          <ellipse cx="116" cy="148" rx="28" ry="18" />
        </g>
        <g fill="var(--scene-cloud-shade)">
          <rect x="42" y="158" width="88" height="6" rx="3" opacity="0.7" />
        </g>
      </g>
    </g>

    <text
      x="572"
      y="176"
      className="px-scene-ghost"
      textAnchor="middle"
    >
      {ghost}
    </text>

    {/* distant meadow ridge */}
    <path
      fill="var(--scene-grass-far)"
      d="M0 264h48v-8h70v6h84v-10h78v8h96v-10h88v8h80v-6h96v8h100V405H0Z"
    />

    {/* the crag: a jagged stepped silhouette, lit on the left, shadowed on the right */}
    <g className="px-scene-rock">
      <path fill="var(--scene-rock)" d={ROCK_PATH} />
      <g fill="var(--scene-rock-lit)">
        <rect x="250" y="86" width="12" height="16" />
        <rect x="236" y="120" width="12" height="22" />
        <rect x="222" y="142" width="12" height="26" />
        <rect x="210" y="168" width="12" height="24" />
        <rect x="200" y="192" width="12" height="24" />
        <rect x="192" y="216" width="12" height="24" />
        <rect x="180" y="240" width="12" height="26" />
        <rect x="168" y="266" width="12" height="38" />
      </g>
      <g fill="var(--scene-rock-dark)">
        <rect x="286" y="86" width="10" height="18" />
        <rect x="298" y="104" width="10" height="22" />
        <rect x="308" y="126" width="10" height="22" />
        <rect x="318" y="148" width="8" height="24" />
        <rect x="326" y="172" width="10" height="26" />
        <rect x="336" y="198" width="10" height="28" />
        <rect x="346" y="226" width="10" height="34" />
        <rect x="356" y="260" width="8" height="44" />
      </g>
      <g fill="var(--scene-rock-crevice)">
        <rect x="264" y="112" width="3" height="52" />
        <rect x="282" y="134" width="3" height="66" />
        <rect x="300" y="162" width="3" height="70" />
        <rect x="232" y="172" width="3" height="60" />
        <rect x="246" y="204" width="3" height="50" />
        <rect x="318" y="204" width="3" height="48" />
      </g>
      <g fill="var(--scene-rock-ledges)">
        <rect x="222" y="148" width="28" height="3" />
        <rect x="200" y="198" width="26" height="3" />
        <rect x="180" y="246" width="24" height="3" />
        <rect x="306" y="172" width="22" height="3" />
        <rect x="330" y="226" width="20" height="3" />
      </g>
    </g>

    {/* bushes tucked at the base of the crag */}
    <g fill="var(--scene-pine)">
      <rect x="150" y="272" width="26" height="14" />
      <rect x="158" y="264" width="16" height="10" />
      <rect x="344" y="278" width="30" height="14" />
      <rect x="354" y="270" width="16" height="10" />
    </g>

    {/* the television, leaning against the crag */}
    <g className="px-scene-tv">
      <ellipse
        cx="352"
        cy="266"
        rx="60"
        ry="42"
        fill="url(#pxSceneGlow)"
        className="px-scene-glow"
      />
      <g stroke="var(--scene-tv-dark)" strokeWidth="2" fill="none">
        <path d="M328 238l-12-26M372 238l12-24" />
      </g>
      <circle cx="316" cy="212" r="3" fill="var(--scene-tv-dark)" />
      <circle cx="384" cy="214" r="3" fill="var(--scene-tv-dark)" />
      <rect x="322" y="236" width="70" height="54" rx="4" fill="var(--scene-tv)" />
      <rect x="328" y="242" width="48" height="34" fill="var(--scene-screen)" />
      <text
        x="352"
        y="262"
        textAnchor="middle"
        className="px-scene-screen-text"
      >
        NO SIGNAL
      </text>
      <rect x="380" y="246" width="6" height="6" fill="var(--scene-tv-dark)" />
      <rect x="380" y="258" width="6" height="6" fill="var(--scene-tv-dark)" />
      <rect x="314" y="290" width="84" height="7" fill="var(--scene-tv-dark)" />
      <rect x="286" y="297" width="102" height="5" fill="var(--scene-tv-shadow)" />
    </g>

    {/* cable spilling from the television toward the seated figure */}
    <path
      className="px-scene-cable"
      d="M392 292c16 12 4 24-12 22-18-2-24 10-6 14 24 6 44-4 62 2 8 3 12 7 20 8"
      fill="none"
      stroke="var(--scene-cable)"
      strokeWidth="2.4"
      strokeLinecap="square"
    />
    <path
      className="px-scene-cable"
      d="M372 300c-4 10 4 16 14 12 11-4 18 4 10 9"
      fill="none"
      stroke="var(--scene-cable)"
      strokeWidth="2.4"
      strokeLinecap="square"
    />

    {/* someone watching the static */}
    <g className="px-scene-figure">
      <rect x="454" y="258" width="14" height="12" fill="var(--scene-skin)" />
      <rect x="453" y="255" width="16" height="5" fill="var(--scene-hair)" />
      <rect x="449" y="270" width="24" height="18" fill="var(--scene-figure)" />
      <rect x="453" y="288" width="7" height="10" fill="var(--scene-figure)" />
      <rect x="463" y="288" width="7" height="10" fill="var(--scene-figure)" />
      <rect x="444" y="297" width="34" height="6" fill="var(--scene-figure-dark)" />
      <rect x="472" y="274" width="7" height="12" fill="var(--scene-figure)" />
      <rect x="475" y="285" width="8" height="5" fill="var(--scene-skin)" />
    </g>

    {/* foreground meadow */}
    <path
      fill="var(--scene-grass-mid)"
      d="M0 316h86v-10h104v8h132v-12h118v10h102v-8h122v12h106V405H0Z"
    />

    <g fill="var(--scene-stone)">
      <rect x="96" y="344" width="14" height="8" />
      <rect x="104" y="340" width="8" height="5" />
      <rect x="248" y="356" width="20" height="9" />
      <rect x="260" y="351" width="11" height="6" />
      <rect x="524" y="336" width="16" height="8" />
      <rect x="634" y="352" width="22" height="10" />
      <rect x="648" y="347" width="10" height="6" />
      <rect x="180" y="372" width="12" height="6" />
    </g>

    <path
      fill="var(--scene-grass-lit)"
      d="M0 360h96v-8h134v10h142v-12h126v9h132v-7h102V405H0Z"
    />

    <g fill="var(--scene-blade)">
      <rect x="58" y="332" width="8" height="3" />
      <rect x="118" y="318" width="6" height="3" />
      <rect x="194" y="338" width="9" height="3" />
      <rect x="352" y="330" width="7" height="3" />
      <rect x="482" y="342" width="10" height="3" />
      <rect x="570" y="324" width="8" height="3" />
      <rect x="666" y="336" width="7" height="3" />
    </g>

    <g className="px-scene-pines">
      <g transform="translate(46 254)" fill="var(--scene-pine)">
        <rect x="6" y="18" width="4" height="18" fill="var(--scene-trunk)" />
        <rect x="0" y="14" width="16" height="6" />
        <rect x="2" y="8" width="12" height="7" />
        <rect x="4" y="2" width="8" height="7" />
        <rect x="6" y="-2" width="4" height="5" />
      </g>
      <g transform="translate(662 252)" fill="var(--scene-pine)">
        <rect x="8" y="22" width="5" height="20" fill="var(--scene-trunk)" />
        <rect x="0" y="17" width="21" height="7" />
        <rect x="3" y="10" width="15" height="8" />
        <rect x="6" y="3" width="9" height="8" />
        <rect x="8" y="-2" width="5" height="6" />
      </g>
      <g transform="translate(614 276)" fill="var(--scene-pine)" opacity="0.85">
        <rect x="4" y="12" width="3" height="12" fill="var(--scene-trunk)" />
        <rect x="0" y="9" width="11" height="4" />
        <rect x="2" y="4" width="8" height="5" />
        <rect x="4" y="0" width="4" height="5" />
      </g>
    </g>

    <rect width="720" height="405" fill="url(#pxSceneVignette)" />
    <rect y="296" width="720" height="109" fill="url(#pxSceneCaption)" />
  </svg>
);

export const EmptyScene: React.FC<EmptySceneProps> = ({
  title,
  body,
  hint,
  ghost = '404',
  action,
  className,
}) => (
  <div className={`px-scene ${className || ''}`.trim()}>
    <div className="px-scene-frame">
      <div className="px-scene-art">
        <SceneArt ghost={ghost} />
        <p className="px-scene-caption">{body}</p>
      </div>

      <div className="px-scene-meta">
        <span className="px-scene-brand">frankenstein</span>
        <span className="px-scene-title" role="heading" aria-level={3}>{title}</span>
        <span className="px-scene-links" aria-hidden="true">gallery · library · sources</span>
      </div>

      {hint ? <p className="px-scene-hint">{hint}</p> : null}
      {action ? <div className="px-scene-action">{action}</div> : null}
    </div>
  </div>
);
