import { memo, useEffect, useRef } from 'react';
import './hillside.css';

// A low, continuous paper-cut ridge on an integer pixel grid. Keep the
// authored panorama wider than a phone rather than squeezing the sprites.
function ridge(heights: number[], step: number) {
  return `M0 96V${heights[0]}${heights.slice(1).map(y => `h${step}V${y}`).join('')}H720V96Z`;
}
const distant = ridge([41,38,34,31,30,26,24,23,26,28,32,36,39,41,43,45,43,41,38,35,31,28,26,22,20,19,21,23,27,30,34,36,39,42,42,40,37], 20);
const middle = ridge([54,52,49,48,48,46,45,46,47,49,51,54,55,55,54,52,49,47,45,44,42,41,42,44,47,50,52,53,52,49,47,46,44,42,41,40,41], 20);
const meadow = ridge([72,71,68,66,65,65,66,67,69,71,72,72,71,70,69,68,68,69,70,72,74,76,77,76,75,73,71,69,68,69,70], 24);

function Pine({ x, y, small = false }: { x: number; y: number; small?: boolean }) {
  return <g transform={`translate(${x} ${y})`}>
    {small ? <>
      <path fill="var(--pine)" d="M0 0h2v2h2v4h2v3h2v2H-5V8h2V5h2V2h1z" />
      <path fill="var(--trunk)" d="M0 11h2v3H0z" />
    </> : <>
      <path fill="var(--trunk)" d="M-1 17h3v8h-3z" />
      <path fill="var(--pine)" d="M0 0h2v3h2v3h2v3h2v2H6v2h3v3h2v4H5v1H-6v-1h-4v-4h2v-3h3v-2h-2V9h2V6h2V3h3z" />
      <path fill="var(--needle)" d="M0 3h2v4H0v3h-3v2h-2V9h2V6h3z M-3 15h4v2h-6v1h-2v-2h4z" />
    </>}
  </g>;
}

const Hills = memo(function Hills() {
  return <svg className="hillside-ground" viewBox="0 0 720 96" aria-hidden="true" shapeRendering="crispEdges">
    <path fill="var(--ridge-far)" d={distant} />
    <path fill="var(--ridge-near)" d={middle} />
    <g fill="var(--grove)">
      {[8,17,22,97,104,111,115,128,210,218,224,416,422,428,435,513,519,638,648,652,658,666,710].map((x,i) =>
        <path key={x} transform={`translate(${x} ${52 + i % 4 * 2})`} d="M0 0h2v3h2v3h2v3h2v6H-5V9h2V6h2V3h1z" />)}
    </g>
    <path fill="var(--grass)" d={meadow} />
    <path fill="var(--grass-shade)" d="M0 88h24v-2h21v-2h32v1h26v2h26v3h28v2h32v2h48v2H0z M481 96v-2h37v-2h32v-3h23v-2h31v-2h41v-2h45v2h30v11z" />
    <g fill="var(--blades)">
      {[16,42,80,103,122,182,217,249,277,299,365,378,414,468,502,538,576,613,663,699].map((x,i) =>
        <path key={x} transform={`translate(${x} ${79 + (i * 7) % 16})`} d="M0 0h3v1H0z M5-1h2v1H5z" />)}
    </g>
    <Pine x={45} y={47} /><Pine x={59} y={57} small />
    <Pine x={145} y={53} small /><Pine x={155} y={44} /><Pine x={167} y={52} small />
    <Pine x={295} y={49} /><Pine x={283} y={59} small />
    <Pine x={482} y={56} small /><Pine x={491} y={49} />
    <Pine x={610} y={47} /><Pine x={623} y={54} small /><Pine x={636} y={50} />
    {/* Cabin, a worn path from its door, and a stump just outside. */}
    <g transform="translate(308 48)">
      <path fill="var(--path)" d="M21 25h8v3h5v3h7v3h9v3h12v3h16v3h17v3H69v-2H56v-3H45v-3H34v-3h-7v-4h-6z" />
      <path fill="var(--grass-shade)" d="M-3 25h43v2h-43z" />
      <path fill="var(--timber)" d="M0 12h33v13H0z" />
      <path fill="var(--timber-lit)" d="M2 14h17v1H2z M2 18h17v1H2z M2 22h17v1H2z" />
      <path fill="var(--roof)" d="M-3 12V9h3V6h3V3h3V0h20v3h3v3h3v3h3v3h2v2H-3z" />
      <path fill="var(--shingle)" d="M-1 9h3V6h3V3h3V1h16v2H9v3H6v3H3v2h-4z" />
      <path fill="var(--roof)" d="M24-4h4v8h-4z M23-5h6v2h-6z" />
      <path fill="var(--opening)" d="M5 15h10v8H5z M22 16h6v9h-6z" />
      <path fill="var(--pane)" d="M6 16h8v5H6z" />
      <path fill="var(--timber)" d="M10 16h1v5h-1z" />
      <path fill="var(--shingle)" d="M26 20h1v1h-1z M4 22h12v1H4z" />
    </g>
    <g transform="translate(352 65)">
      <path fill="var(--grass-shade)" d="M-2 12h19v2H-2z" />
      <path fill="var(--timber)" d="M1 6h13v5h1v2H0v-2h1z" />
      <path fill="var(--timber-lit)" d="M0 6h15v2H0z M3 9h1v3H3z M11 8h1v3h-1z" />
      {/* The little red radio has a telescopic antenna, grille and VU display. */}
      <path fill="var(--antenna)" d="M12 0h1v-3h1v-3h1v-2h1v3h-1v3h-1v3h-2z" />
      <path fill="var(--opening)" d="M2-1h2v-2h5v2h2v1H8v-2H5v2H2z M0 0h15v6H0z" />
      <path fill="var(--radio)" d="M0-1h15v6H0z" />
      <path fill="var(--radio-highlight)" d="M1-1h12v1H1z" />
      <path fill="var(--opening)" d="M2 1h4v1H2z M2 3h4v1H2z M8 0h6v4H8z" />
      <g fill="var(--meter)">
        <rect className="hillside-bar" x="9" y="1" width="1" height="3" />
        <rect className="hillside-bar hillside-bar-b" x="11" y="1" width="1" height="3" />
      </g>
    </g>
  </svg>;
});

export const Hillside = memo(function Hillside({ playing }: { playing: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = () => { if (ref.current) ref.current.dataset.sleep = String(document.hidden); };
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return <div className="hillside" ref={ref} data-playing={playing} aria-hidden="true">
    {/* The sun sinks below the ridge as the moon climbs into the night sky. */}
    <svg className="hillside-orb hillside-sun" viewBox="0 0 32 32" shapeRendering="crispEdges">
      <path fill="var(--sun)" d="M12 1h8v2h4v2h3v3h2v4h2v8h-2v4h-2v3h-3v2h-4v2h-8v-2H8v-2H5v-3H3v-4H1v-8h2V8h2V5h3V3h4z" />
      <rect x="11" y="11" width="10" height="10" fill="var(--sun-core)" />
    </svg>
    <svg className="hillside-orb hillside-moon" viewBox="0 0 32 32" shapeRendering="crispEdges">
      <path
        fill="var(--moon)"
        fillRule="evenodd"
        d="M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26z M22 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22z"
      />
    </svg>
    <svg className="hillside-weather" viewBox="0 0 720 98" shapeRendering="crispEdges">
      <g className="hillside-clouds" fill="var(--cloud)">
        <path d="M48 31h8v-3h8v-4h14v2h6v4h9v2h8v3H45v-2h3z M362 12h8v-4h12v-3h15v2h5v3h9v3h8v3h-64v-2h7z" />
        <path d="M536 53h7v-3h5v-3h15v2h6v3h8v3h-45v-1h4z M682 19h5v-3h11v2h7v3h-23z" />
      </g>
      <g className="hillside-stars" fill="#d3d6e2">
        {[[45,19],[98,61],[185,13],[269,45],[333,24],[398,65],[446,15],[522,37],[590,12],[671,43]].map(([x,y]) =>
          <rect key={x} x={x} y={y} width="1" height="1" />)}
        <path d="M215 68h1v2h2v1h-2v2h-1v-2h-2v-1h2z M604 60h1v1h1v1h-1v1h-1v-1h-1v-1h1z" />
      </g>
    </svg>
    <Hills />
  </div>;
});
