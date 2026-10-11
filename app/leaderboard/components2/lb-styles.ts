export const LB_CSS = `
@keyframes lb-rise{from{opacity:0;transform:translate3d(0,26px,0)}}
@keyframes lb-slide{from{opacity:0;transform:translate3d(-26px,0,0)}}
@keyframes lb-pop{from{opacity:0;transform:scale(.85)}}
@keyframes lb-bar{from{transform:scaleX(0)}}
@keyframes lb-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-8px,0)}}
@keyframes lb-pulse{0%{opacity:.6;transform:scale(1)}100%{opacity:0;transform:scale(1.35)}}
.lb-rise{animation:lb-rise .6s cubic-bezier(.2,.8,.2,1) var(--d,0s) backwards}
.lb-slide{animation:lb-slide .55s cubic-bezier(.2,.8,.2,1) var(--d,0s) backwards}
.lb-pop{animation:lb-pop .5s cubic-bezier(.34,1.56,.64,1) var(--d,0s) backwards}
.lb-bar{transform:scaleX(var(--r,1));animation:lb-bar .9s cubic-bezier(.2,.8,.2,1) var(--d,0s) backwards}
.lb-float{animation:lb-float 3.2s ease-in-out infinite}
.lb-pulse{animation:lb-pulse 2.4s ease-out infinite}
[data-lite="true"] .lb-float,
[data-lite="true"] .lb-pulse{animation:none}
[data-lite="true"] .lb-rise,
[data-lite="true"] .lb-slide,
[data-lite="true"] .lb-pop{animation-duration:.25s}
@media (prefers-reduced-motion: reduce){
  .lb-rise,.lb-slide,.lb-pop,.lb-bar,.lb-float,.lb-pulse{animation:none!important}
}
`;