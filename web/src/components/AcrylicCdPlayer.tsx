import React from 'react';
import { Track } from '../data/musicData';

interface AcrylicCdPlayerProps {
  isPlaying: boolean;
  track?: Track;
  size?: number; // size in pixels, default 280
  className?: string;
  onTogglePlay?: () => void;
}

export const AcrylicCdPlayer: React.FC<AcrylicCdPlayerProps> = ({
  isPlaying,
  size = 280,
  className = '',
  onTogglePlay,
}) => {
  const baseSize = 280;
  const scale = size / baseSize;

  return (
    <div
      id="acrylic-cd-player"
      onClick={onTogglePlay}
      title={onTogglePlay ? (isPlaying ? 'Pause' : 'Play') : undefined}
      className={`relative select-none flex-shrink-0 overflow-hidden rounded-[14px] ${onTogglePlay ? 'cursor-pointer group' : ''} ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div
        style={{
          width: `${baseSize}px`,
          height: `${baseSize}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="relative"
      >
        {/* Outer Acrylic Jewel Case (Square with molded edges & specular reflections) */}
        <div className="relative w-full h-full rounded-[14px] bg-[#EEF1EA]/25 backdrop-blur-[2px] p-[10px] border border-[#CBD2C6]/80 shadow-[0_4px_20px_rgba(36,48,42,0.08),inset_0_1px_2px_rgba(255,255,255,0.9),inset_0_-1px_2px_rgba(0,0,0,0.06)] overflow-hidden">
        
        {/* Molded Jewel Case Rim Details (Corner brackets, hinges, snap tabs) */}
        {/* Left latch tab */}
        <div className="absolute left-[3px] top-1/2 -translate-y-1/2 w-[9px] h-[38px] rounded-[3px] border border-[#B8C2B3]/70 bg-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] z-20 pointer-events-none" />
        
        {/* Top-left corner bracket */}
        <div className="absolute left-[4px] top-[4px] w-[26px] h-[26px] border-t-2 border-l-2 border-[#CBD2C6]/70 rounded-tl-[6px] pointer-events-none z-20" />
        {/* Top-right corner bracket */}
        <div className="absolute right-[4px] top-[4px] w-[26px] h-[26px] border-t-2 border-r-2 border-[#CBD2C6]/70 rounded-tr-[6px] pointer-events-none z-20" />
        {/* Bottom-left corner bracket */}
        <div className="absolute left-[4px] bottom-[4px] w-[26px] h-[26px] border-b-2 border-l-2 border-[#CBD2C6]/70 rounded-bl-[6px] pointer-events-none z-20" />
        {/* Bottom-right corner bracket */}
        <div className="absolute right-[4px] bottom-[4px] w-[26px] h-[26px] border-b-2 border-r-2 border-[#CBD2C6]/70 rounded-br-[6px] pointer-events-none z-20" />
        
        {/* Right side plastic hinges */}
        <div className="absolute right-[3px] top-[24px] w-[5px] h-[16px] rounded-[2px] bg-white/60 border border-[#CBD2C6]/80 z-20" />
        <div className="absolute right-[3px] bottom-[24px] w-[5px] h-[16px] rounded-[2px] bg-white/60 border border-[#CBD2C6]/80 z-20" />

        {/* Diagonal Specular Reflection across the clear acrylic lid */}
        <div
          className="absolute inset-0 pointer-events-none z-30 opacity-40 mix-blend-overlay"
          style={{
            background:
              'linear-gradient(125deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.05) 30%, transparent 45%, rgba(255,255,255,0.3) 55%, transparent 70%, rgba(255,255,255,0.5) 100%)',
          }}
        />

        {/* ------------------------------------------------------------- */}
        {/* ROTATING CD DISC CONTAINER                                    */}
        {/* ------------------------------------------------------------- */}
        <div className="w-full h-full flex items-center justify-center relative">
          {/* Outer circular tray groove */}
          <div className="absolute w-[94%] h-[94%] rounded-full border border-[#CBD2C6]/50 pointer-events-none" />

          {/* The Spinning Disc itself */}
          <div
            className="w-[92%] h-[92%] rounded-full relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.12)] border border-black/10"
            style={{
              animation: 'cd-spin 16s linear infinite',
              animationPlayState: isPlaying ? 'running' : 'paused',
            }}
          >
            {/* CD Surface: Lush watercolor botanical background matching the image */}
            <div className="absolute inset-0 bg-[#E8EFE3]">
              {/* Subtle rainbow CD refraction angles via CSS conic-gradient */}
              <div
                className="absolute inset-0 rounded-full opacity-30 mix-blend-color-dodge pointer-events-none"
                style={{
                  background:
                    'conic-gradient(from 0deg at 50% 50%, #F3E9D2 0deg, #D9EAD3 60deg, #C9DAF8 120deg, #EAD1DC 180deg, #D9EAD3 240deg, #FFF2CC 300deg, #F3E9D2 360deg)',
                }}
              />
              <svg
                viewBox="0 0 300 300"
                className="w-full h-full object-cover relative z-10"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Iridescent radial shimmer */}
                  <radialGradient id="discShimmer" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#F5F7F0" stopOpacity="0.1" />
                    <stop offset="60%" stopColor="#E0EDD8" stopOpacity="0.4" />
                    <stop offset="85%" stopColor="#D2E4CA" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#BED7B3" stopOpacity="0.8" />
                  </radialGradient>
                </defs>

                {/* Disc Base Art */}
                <rect width="300" height="300" fill="#E8EEDE" />
                <rect width="300" height="300" fill="url(#discShimmer)" />

                {/* Hand-painted botanical watercolor layers from reference image */}
                {/* Vertical soft green foliage stripes */}
                <path
                  d="M130,0 Q140,120 120,300 L165,300 Q175,140 155,0 Z"
                  fill="#7FA972"
                  opacity="0.55"
                />
                <path
                  d="M190,0 Q210,130 195,300 L230,300 Q250,110 220,0 Z"
                  fill="#65905A"
                  opacity="0.6"
                />
                <path
                  d="M70,30 Q90,140 80,300 L115,300 Q120,150 100,20 Z"
                  fill="#9ABF8E"
                  opacity="0.5"
                />
                <path
                  d="M210,140 Q250,210 240,300 L275,300 Q285,190 245,130 Z"
                  fill="#547E4B"
                  opacity="0.65"
                />

                {/* Soft yellow watercolor washes */}
                <circle cx="95" cy="110" r="55" fill="#EBD99F" opacity="0.6" />
                <circle cx="210" cy="95" r="45" fill="#E3DFB8" opacity="0.5" />
                <circle cx="110" cy="220" r="60" fill="#EFE8C3" opacity="0.5" />

                {/* Delicate floral dots & specks (like on the reference CD) */}
                <circle cx="82" cy="138" r="3.5" fill="#A87258" opacity="0.6" />
                <circle cx="75" cy="150" r="2.5" fill="#A87258" opacity="0.5" />
                <circle cx="90" cy="155" r="3.2" fill="#B57C62" opacity="0.55" />
                <circle cx="85" cy="168" r="2" fill="#A87258" opacity="0.5" />
                <circle cx="70" cy="162" r="2.8" fill="#8F5E48" opacity="0.6" />
                <circle cx="96" cy="142" r="2" fill="#A87258" opacity="0.4" />

                {/* CD Audio Grooves / Concentric Track Rings */}
                <circle cx="150" cy="150" r="142" fill="none" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.5" />
                <circle cx="150" cy="150" r="136" fill="none" stroke="#24302A" strokeWidth="0.5" opacity="0.12" />
                <circle cx="150" cy="150" r="124" fill="none" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.4" />
                <circle cx="150" cy="150" r="108" fill="none" stroke="#24302A" strokeWidth="0.5" opacity="0.1" />
                <circle cx="150" cy="150" r="92" fill="none" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.45" />
                <circle cx="150" cy="150" r="76" fill="none" stroke="#24302A" strokeWidth="0.5" opacity="0.12" />
                <circle cx="150" cy="150" r="62" fill="none" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.5" />

                {/* Clear inner ring mirror band */}
                <circle cx="150" cy="150" r="54" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" />
                <circle cx="150" cy="150" r="50" fill="none" stroke="#A3ADA5" strokeWidth="0.75" opacity="0.4" />
                <circle cx="150" cy="150" r="44" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.7" />

                {/* Clear transparent inner ring band */}
                <circle cx="150" cy="150" r="38" fill="#FFFFFF" opacity="0.4" />

                {/* Center Black CD Spindle Hub Clamp */}
                <circle cx="150" cy="150" r="33" fill="#1C2420" stroke="#2E3A33" strokeWidth="1.5" />
                {/* 4 small circular grip holes in the clamp ring */}
                <circle cx="137" cy="137" r="3.2" fill="#0D1210" />
                <circle cx="163" cy="137" r="3.2" fill="#0D1210" />
                <circle cx="137" cy="163" r="3.2" fill="#0D1210" />
                <circle cx="163" cy="163" r="3.2" fill="#0D1210" />

                {/* Center hole */}
                <circle cx="150" cy="150" r="22" fill="#EEF1EA" stroke="#1C2420" strokeWidth="2" />
                <circle cx="150" cy="150" r="11" fill="#24302A" />
              </svg>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* STICKERS ON THE ACRYLIC CASE (Positioned over the rotating disc)*/}
        {/* ------------------------------------------------------------- */}

        {/* 1. Top-Left Postage Stamp: "60 Cent / HOUSE PLANTS / Monstera" */}
        <div
          className="absolute left-[24px] top-[24px] z-30 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.14)]"
          style={{ width: '46px', height: '58px' }}
        >
          <div className="w-full h-full bg-[#FAF8F2] border border-dashed border-[#C8CFBF] rounded-[1px] p-[3px] flex flex-col justify-between select-none">
            {/* Top row */}
            <div className="flex justify-between items-center text-[7px] text-[#5A685D] font-mono leading-none">
              <span>60</span>
              <span className="text-[6px]">Cent</span>
            </div>

            {/* Middle: Monstera illustration & vertical text */}
            <div className="flex items-center justify-between my-0.5 px-0.5">
              <svg viewBox="0 0 24 24" className="w-[18px] h-[22px] text-[#4A7843]">
                {/* Monstera leaf shape */}
                <path
                  d="M12 2C8 4 6 8 7 14C5 12 4 10 3 13C2 17 5 21 11 22C11 20 9 17 11 15C13 18 16 19 19 17C21 15 21 10 18 6C16 3 13 2 12 2Z"
                  fill="#4D7644"
                />
                <path d="M11 22V10" stroke="#FAF8F2" strokeWidth="1" />
                <circle cx="9" cy="9" r="1.2" fill="#FAF8F2" />
                <circle cx="14" cy="11" r="1.2" fill="#FAF8F2" />
              </svg>
              <span
                className="text-[5px] tracking-wider text-[#6A7B6E] font-sans font-semibold uppercase origin-center rotate-90"
                style={{ transform: 'rotate(90deg) translate(0, -1px)' }}
              >
                Plants
              </span>
            </div>

            {/* Bottom cursive text */}
            <div className="text-[6px] italic text-[#6A7B6E] font-serif text-center leading-none">
              Monstera
            </div>
          </div>
        </div>

        {/* 2. Top-Right: Flower blossom + Brown garden snail sticker */}
        <div className="absolute right-[24px] top-[18px] z-30 pointer-events-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.12)]">
          {/* Flower Blossom with Translucent White Petals & Dark Violet Center */}
          <div className="relative w-[52px] h-[52px]">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Petals */}
              <ellipse cx="50" cy="24" rx="16" ry="22" fill="#FFFFFF" fillOpacity="0.9" />
              <ellipse cx="26" cy="50" rx="22" ry="16" fill="#FFFFFF" fillOpacity="0.88" />
              <ellipse cx="74" cy="48" rx="22" ry="17" fill="#FFFFFF" fillOpacity="0.9" />
              <ellipse cx="64" cy="74" rx="18" ry="22" fill="#F4F6F0" fillOpacity="0.85" />
              <ellipse cx="36" cy="74" rx="18" ry="22" fill="#F4F6F0" fillOpacity="0.85" />
              {/* Center dark eye */}
              <circle cx="50" cy="50" r="9" fill="#3D2B3D" opacity="0.85" />
              <circle cx="50" cy="50" r="4" fill="#F4D03F" opacity="0.9" />
            </svg>

            {/* Small Brown Garden Snail sitting nearby */}
            <div
              className="absolute -left-[14px] top-[14px] w-[22px] h-[22px]"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.18))' }}
            >
              <svg viewBox="0 0 40 40" className="w-full h-full">
                {/* Spiral shell */}
                <circle cx="22" cy="18" r="14" fill="#A8744F" />
                <path
                  d="M22 6 A 12 12 0 1 1 12 24 A 7 7 0 1 1 20 20"
                  fill="none"
                  stroke="#7A4E32"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* Soft foot and head */}
                <ellipse cx="14" cy="26" rx="12" ry="4" fill="#D7B18E" />
                {/* Tentacles */}
                <path d="M6 23 L3 19" stroke="#B88A64" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 23 L7 18" stroke="#B88A64" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* 3. Mid-Right: Warm Yellow 5-Point Star Sticker */}
        <div
          className="absolute right-[32px] top-[76px] z-30 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
          style={{ width: '38px', height: '38px' }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Painted gouache yellow star */}
            <polygon
              points="50,5 64,36 98,38 72,62 80,95 50,77 20,95 28,62 2,38 36,36"
              fill="#F2C94C"
              stroke="#E2B93B"
              strokeWidth="2"
            />
            {/* Inner soft highlight stroke */}
            <polygon
              points="50,18 60,39 82,41 65,56 70,78 50,66 30,78 35,56 18,41 40,39"
              fill="#F7DC6F"
              opacity="0.8"
            />
          </svg>
        </div>

        {/* 4. Bottom-Left: Peach/Orange Watercolor Goldfish Sticker */}
        <div
          className="absolute left-[24px] bottom-[26px] z-30 pointer-events-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.18)]"
          style={{ width: '105px', height: '48px' }}
        >
          {/* White die-cut sticker outline around the fish */}
          <svg viewBox="0 0 160 80" className="w-full h-full">
            {/* White sticker border */}
            <g
              stroke="#FFFFFF"
              strokeWidth="7"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              {/* Tail fin */}
              <path d="M5 25 C15 35, 15 45, 5 55 C25 50, 40 45, 45 40 C40 35, 25 30, 5 25 Z" fill="#FFFFFF" />
              {/* Body */}
              <ellipse cx="90" cy="40" rx="50" ry="24" fill="#FFFFFF" />
            </g>

            {/* Fish Body: Peach-Orange Watercolor with scales */}
            {/* Tail */}
            <path
              d="M10 28 C20 36, 20 44, 10 52 C28 47, 40 43, 46 40 C40 37, 28 33, 10 28 Z"
              fill="#F5A374"
              stroke="#DD7B46"
              strokeWidth="1.2"
            />
            <path d="M12 32 L36 39" stroke="#DE753F" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
            <path d="M12 48 L36 41" stroke="#DE753F" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
            
            {/* Dorsal Fin */}
            <path
              d="M65 20 C75 14, 95 14, 110 20 C100 24, 80 24, 65 20 Z"
              fill="#EE8B56"
              stroke="#D3672F"
              strokeWidth="1"
            />

            {/* Main Body */}
            <ellipse
              cx="92"
              cy="40"
              rx="46"
              ry="21"
              fill="#F8B188"
              stroke="#DE753F"
              strokeWidth="1.5"
            />
            {/* Belly highlight */}
            <path
              d="M58 44 Q90 60 130 44 Q90 54 58 44 Z"
              fill="#FCE4D6"
              opacity="0.8"
            />
            {/* Subtle painted scales */}
            <path d="M72 36 Q76 41 72 46" fill="none" stroke="#DE753F" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M82 32 Q86 37 82 42" fill="none" stroke="#DE753F" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M84 42 Q88 47 84 52" fill="none" stroke="#DE753F" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M94 36 Q98 41 94 46" fill="none" stroke="#DE753F" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M104 33 Q108 38 104 43" fill="none" stroke="#DE753F" strokeWidth="1.2" strokeLinecap="round" />

            {/* Eye: orange rim, cream ring, black pupil, white glint */}
            <circle cx="126" cy="38" r="6" fill="#F8B188" stroke="#DE753F" strokeWidth="1.2" />
            <circle cx="126" cy="38" r="4.2" fill="#FFF2CC" />
            <circle cx="126" cy="38" r="2.4" fill="#24302A" />
            <circle cx="125" cy="37" r="0.9" fill="#FFFFFF" />
          </svg>
        </div>

        {/* 5. Bottom-Right: Olive-Sage Star Sticker with Double Outline */}
        <div
          className="absolute right-[22px] bottom-[26px] z-30 pointer-events-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.14)]"
          style={{ width: '48px', height: '48px' }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* White die-cut base */}
            <polygon
              points="50,8 62,38 95,40 70,62 78,94 50,76 22,94 30,62 5,40 38,38"
              fill="#FFFFFF"
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            {/* Outer sage star */}
            <polygon
              points="50,12 61,38 92,40 68,60 76,90 50,74 24,90 32,60 8,40 39,38"
              fill="#8FA87F"
              stroke="#6F8860"
              strokeWidth="1.5"
            />
            {/* Inner cream star outline */}
            <polygon
              points="50,24 58,42 80,44 63,58 68,80 50,68 32,80 37,58 20,44 42,42"
              fill="#F4F7EE"
              stroke="#6F8860"
              strokeWidth="1.5"
            />
            {/* Center sage star */}
            <polygon
              points="50,34 55,46 68,47 58,56 61,69 50,62 39,69 42,56 32,47 45,46"
              fill="#7B946D"
            />
          </svg>
        </div>

        </div>

      </div>

      {/* Global CSS keyframes for rotation if not already in index.css */}
      <style>{`
        @keyframes cd-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
