'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Variant } from './vp-types';

/* Scroll reveal (IntersectionObserver, hanya transform + opacity) */

export const RevealCtx = createContext<{
    root: React.RefObject<HTMLDivElement | null>;
    enabled: boolean;
    lite: boolean;
}>({ root: { current: null }, enabled: false, lite: false });

export function useReveal<T extends HTMLElement>() {
    const { root, enabled, lite } = useContext(RevealCtx);
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        if (!enabled || inView) return;
        const el = ref.current;
        if (!el) return;
        if (typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setInView(true);
                    io.disconnect();
                }
            },
            { root: root.current, threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [enabled, inView, root]);

    return { ref, inView, lite };
}

export function rvProps(inView: boolean, lite: boolean, variant: Variant, delay: number) {
    const v: Variant = lite ? 'fade' : variant;
    return {
        className: `vp-rv ${v}${inView ? ' in' : ''}`,
        style: { ['--d' as string]: `${lite ? Math.min(delay, 0.12) : delay}s` } as React.CSSProperties,
    };
}

export function stag(on: boolean, lite: boolean, delay: number, dx = 0, dy = 0): React.CSSProperties {
    if (lite) {
        return { opacity: on ? 1 : 0, transition: `opacity .4s ease ${Math.min(delay, 0.15)}s` };
    }
    return {
        opacity: on ? 1 : 0,
        transform: on ? 'none' : `translate3d(${dx}px,${dy}px,0)`,
        transition: `opacity .6s ease ${delay}s, transform .7s cubic-bezier(.2,.8,.2,1) ${delay}s`,
    };
}

export function Reveal({
    variant = 'up',
    delay = 0,
    className = '',
    children,
}: {
    variant?: Variant;
    delay?: number;
    className?: string;
    children: React.ReactNode;
}) {
    const { ref, inView, lite } = useReveal<HTMLDivElement>();
    const p = rvProps(inView, lite, variant, delay);
    return (
        <div ref={ref} className={`${p.className} ${className}`} style={p.style}>
            {children}
        </div>
    );
}

export function CountUp({ value, active, lite }: { value: number; active: boolean; lite: boolean }) {
    const ref = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
        if (!active || lite) return;
        const el = ref.current;
        if (!el) return;
        const dur = 900;
        const t0 = performance.now();
        let raf = 0;
        const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / dur);
            const e = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(value * e));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [active, lite, value]);

    return <span ref={ref}>{lite ? value : 0}</span>;
}

export const REVEAL_CSS = `
.vp-rv{opacity:0;transition:opacity .6s ease var(--d,0s),transform .75s cubic-bezier(.2,.8,.2,1) var(--d,0s)}
.vp-rv.up{transform:translate3d(0,28px,0)}
.vp-rv.left{transform:translate3d(-36px,0,0)}
.vp-rv.right{transform:translate3d(36px,0,0)}
.vp-rv.zoom{transform:scale(.88)}
.vp-rv.pop{transform:scale(.6);transition-timing-function:ease,cubic-bezier(.34,1.56,.64,1)}
.vp-rv.flip{transform:perspective(700px) rotateX(40deg) translate3d(0,18px,0);transform-origin:50% 100%}
.vp-rv.fade{transition:opacity .45s ease var(--d,0s)}
.vp-rv.in{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){
  .vp-rv{transition:none!important;opacity:1!important;transform:none!important}
}
`;