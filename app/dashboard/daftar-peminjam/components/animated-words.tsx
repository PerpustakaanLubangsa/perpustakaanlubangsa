import React from 'react';

// Kata muncul satu per satu (animasi `word-in` ada di ANIMASI_CSS pada gaya.ts)
export default function AnimatedWords({
  text,
  startDelay = 0,
  step = 60,
}: {
  text: string;
  startDelay?: number;
  step?: number;
}) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <React.Fragment key={i}>
          <span className="word-in inline-block" style={{ animationDelay: `${startDelay + i * step}ms` }}>
            {word}
          </span>{' '}
        </React.Fragment>
      ))}
    </>
  );
}