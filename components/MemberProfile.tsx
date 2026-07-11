'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface MemberProfileProps {
  memberId?: string;
  onBack?: () => void;
}

export default function MemberProfile({ memberId, onBack }: MemberProfileProps) {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Animation States
  const [showIntro, setShowIntro] = useState(false);
  const [revealActive, setRevealActive] = useState(false);
  const [staggerShow, setStaggerShow] = useState(false);
  const [showFlyer, setShowFlyer] = useState(false);
  const [flyerStyle, setFlyerStyle] = useState<React.CSSProperties | undefined>(undefined);
  const [screenShake, setScreenShake] = useState(false);
  const [shootShake, setShootShake] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  // Refs untuk kalkulasi koordinat tembakan animasi
  const introImgRef = useRef<HTMLImageElement>(null);
  const finalImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      const queryId = searchParams.get('id');
      const storedLocal = JSON.parse(localStorage.getItem('selectedUser') || 'null');
      const targetId = (memberId || queryId || storedLocal?.id || storedLocal?.id_anggota || storedLocal?.nis || '').trim();
      
      if (!targetId || targetId === 'undefined') {
        setLoading(false);
        return;
      }

      const orFilter = `id.eq.${targetId},nis.eq.${targetId}`;

      const { data, error } = await supabase
        .from('anggota')
        .select('id, nama, rank, avatar_rank')
        .or(orFilter)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        setLoading(false);
        triggerEpicPresentation();
      } else {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [memberId, searchParams]);

  function triggerEpicPresentation() {
    setShowIntro(true);

    setTimeout(() => {
      setRevealActive(true);

      if (introImgRef.current && finalImgRef.current) {
        const rStart = introImgRef.current.getBoundingClientRect();
        const rEnd = finalImgRef.current.getBoundingClientRect();

        setFlyerStyle({
          position: 'fixed',
          zIndex: 1000,
          top: rStart.top,
          left: rStart.left,
          width: rStart.width,
          height: rStart.height,
          transition: 'all 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
        });
        setShowFlyer(true);

        requestAnimationFrame(() => {
          setTimeout(() => {
            setFlyerStyle({
              position: 'fixed',
              zIndex: 1000,
              top: rEnd.top,
              left: rEnd.left,
              width: rEnd.width,
              height: rEnd.height,
              transition: 'all 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
            });
          }, 20);
        });
      }

      setTimeout(() => setShowIntro(false), 250);

      setTimeout(() => {
        setShowFlyer(false);
        setScreenShake(true);
        setShootShake(true);
        setFlashActive(true);

        setTimeout(() => {
          setScreenShake(false);
          setShootShake(false);
          setFlashActive(false);
        }, 350);

        setTimeout(() => setStaggerShow(true), 100);
      }, 460);
    }, 1800);
  }

  const handleReset = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-4 text-xs text-slate-400 font-medium">
        Data profil tidak ditemukan.
      </div>
    );
  }

  // Cek apakah nama cukup panjang untuk memicu efek berjalan (> 15 karakter)
  const isNamaPanjang = profile.nama && profile.nama.length > 15;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-slate-50 transition-colors duration-300 ${screenShake ? 'animate-[shakeImpact_0.3s_both]' : ''}`}>
      
      {/* 1. CINEMATIC LIGHT INTRO SPLASH */}
      {showIntro && (
        <div className="fixed inset-0 z-[998] bg-white flex flex-col items-center justify-center transition-opacity duration-300">
          <div className="text-center space-y-6 relative flex flex-col items-center justify-center w-full max-w-4xl px-4">
            <p className="text-[10px] text-blue-600 font-black tracking-[0.5em] uppercase opacity-80 animate-pulse">
              RANK UNLOCKED
            </p>
            <div className="flex items-center justify-center relative">
              <img 
                ref={introImgRef}
                src={profile.avatar_rank || '/image/profile/default-badge.png'} 
                className="w-[280px] h-[280px] object-contain animate-[gamePopImpact_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]" 
                alt="Rank Intro"
              />
            </div>
            <h1 className="text-slate-800 text-3xl font-black uppercase italic tracking-widest animate-[gameTextSpread_0.6s_ease-out_0.2s_forwards] opacity-0 py-2">
              {profile.rank || 'WARRIOR'}
            </h1>
          </div>
        </div>
      )}

      {/* 2. ELEMEN CLONING YANG DI-TEMBAK */}
      {showFlyer && (
        <div style={flyerStyle}>
          <img src={profile.avatar_rank || '/image/profile/default-badge.png'} className="w-full h-full object-contain" alt="flying-badge" />
        </div>
      )}

      {/* 3. KARTU PROFIL UTAMA */}
      <div className={`flex flex-col items-center justify-center p-6 text-center bg-white border border-slate-200 rounded-3xl shadow-md max-w-sm w-full mx-auto transition-all duration-500 ${revealActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        
        {/* TEMPAT LANDASAN GAMBAR RANK */}
        <div className="w-[180px] h-[180px] flex items-center justify-center mb-4 relative">
          <div className={`absolute w-full h-full bg-[radial-gradient(circle,rgba(59,130,246,0.4)_0%,transparent_70%)] rounded-full opacity-0 pointer-events-none z-10 ${flashActive ? 'animate-[flashBurst_0.35s_ease-out_forwards]' : ''}`} />
          
          <img 
            ref={finalImgRef}
            src={profile.avatar_rank || '/image/profile/default-badge.png'} 
            className={`w-full h-full object-contain transition-opacity duration-200 ${showIntro ? 'opacity-0' : 'opacity-100'} ${shootShake ? 'animate-[shootRecoil_0.2s_ease-out_both]' : 'animate-[float_3s_ease-in-out_infinite]'}`}
            alt="Rank Badge"
          />
        </div>

        {/* NAMA RANK */}
        <span className={`px-4 py-1 rounded-full border border-blue-600 text-blue-600 text-[10px] font-black tracking-widest uppercase bg-blue-50 mb-4 transition-all duration-500 ${staggerShow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          {(profile.rank || 'WARRIOR').toUpperCase()}
        </span>

        {/* NAMA MEMBER (DENGAN EFEK BERJALAN JIKA TERPOTONG) */}
        <div className={`w-full overflow-hidden whitespace-nowrap relative mb-6 h-7 transition-all duration-500 delay-75 ${staggerShow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          {isNamaPanjang ? (
            <div className="inline-block animate-[marqueeName_12s_linear_infinite] text-lg font-extrabold uppercase tracking-wide text-slate-800 pr-4">
              <span>{profile.nama}</span>
              <span className="mx-8 text-blue-500">•</span>
              <span>{profile.nama}</span>
              <span className="mx-8 text-blue-500">•</span>
            </div>
          ) : (
            <h2 className="text-lg font-extrabold uppercase tracking-wide text-slate-800">
              {profile.nama || '---'}
            </h2>
          )}
        </div>

        {/* TOMBOL CATAT KUNJUNGAN LAIN */}
        <button
          onClick={handleReset}
          className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 hover:scale-[1.03] active:scale-[0.98] cursor-pointer text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all duration-200 ease-out delay-150 ${staggerShow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
        >
          Catat Kunjungan Lain
        </button>

      </div>

      {/* Style CSS Global */}
      <style jsx global>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes shootRecoil { 0% { transform: scale(1); } 15% { transform: scale(0.85) translateY(4px); } 30% { transform: scale(1.05) translateY(-2px); } 100% { transform: scale(1); } }
        @keyframes gamePopImpact { 0% { transform: scale(0.4); opacity: 0; } 50% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes gameTextSpread { 0% { opacity: 0; transform: translateY(10px); letter-spacing: 0.1em; } 100% { opacity: 1; transform: translateY(0); letter-spacing: 0.2em; } }
        @keyframes shakeImpact { 10%, 90% { transform: translate3d(-1px, -1px, 0); } 20%, 80% { transform: translate3d(1px, 1px, 0); } 40%, 60% { transform: translate3d(-2px, 0, 0); } }
        @keyframes flashBurst { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes marqueeName { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-50%, 0, 0); } }
      `}</style>
    </div>
  );
}