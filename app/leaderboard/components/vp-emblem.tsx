'use client';

import React, { useEffect, useState } from 'react';

export default function Emblem({ src, alt }: { src: string | null; alt: string }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [src]);

    if (!src || failed) {
        return (
            <svg viewBox="0 0 100 100" className="h-full w-full" aria-label={alt}>
                <defs>
                    <linearGradient id="vpShieldBlue" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#bfdbfe" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1e3a8a" />
                    </linearGradient>
                </defs>
                <path
                    d="M50 6 L88 20 V50 C88 74 70 90 50 96 C30 90 12 74 12 50 V20 Z"
                    fill="url(#vpShieldBlue)"
                    stroke="#dbeafe"
                    strokeWidth="2"
                />
                <polygon
                    points="50,28 56,44 73,45 60,56 64,72 50,63 36,72 40,56 27,45 44,44"
                    fill="#eff6ff"
                />
            </svg>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            onError={() => setFailed(true)}
            draggable={false}
            className="h-full w-full object-contain"
        />
    );
}