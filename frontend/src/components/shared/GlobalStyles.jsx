export default function GlobalStyles() {
  return (
    <style>{`
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(15,110,86,0); }
        50%       { box-shadow: 0 0 0 8px rgba(15,110,86,0.25); }
      }
      @keyframes shimmer-bg {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-8px); }
      }
      @keyframes ring-fill {
        0%         { stroke-dashoffset: 251; }
        40%, 60%   { stroke-dashoffset: 20; }
        100%       { stroke-dashoffset: 251; }
      }
      @keyframes check-appear {
        0%, 45%   { opacity: 0; transform: scale(0.5); }
        60%       { opacity: 1; transform: scale(1.1); }
        70%, 100% { opacity: 1; transform: scale(1); }
      }
      @keyframes toast-enter {
        from { transform: translateX(120%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes toast-exit {
        from { transform: translateX(0);    opacity: 1; }
        to   { transform: translateX(120%); opacity: 0; }
      }
      @keyframes greeting-enter {
        from { transform: translateY(-20px); opacity: 0; }
        to   { transform: translateY(0);     opacity: 1; }
      }
      @keyframes card-enter {
        from { transform: translateY(10px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      @keyframes spring-pop {
        0%   { transform: scale(0.75) translateY(30px); opacity: 0; }
        50%  { transform: scale(1.04) translateY(-6px); opacity: 1; }
        70%  { transform: scale(0.98) translateY(3px); }
        85%  { transform: scale(1.01) translateY(-2px); }
        100% { transform: scale(1) translateY(0); opacity: 1; }
      }
      @keyframes genie-out {
        0%   { transform: scaleY(1) translateY(0); opacity: 1; max-height: 200px; }
        40%  { transform: scaleY(0.6) translateY(10px); opacity: 0.7; }
        70%  { transform: scaleY(0.2) translateY(20px); opacity: 0.3; }
        100% { transform: scaleY(0) translateY(30px); opacity: 0; max-height: 0; }
      }
      @keyframes genie-to-bar {
        0%   { transform: scale(1) translateY(0); opacity: 1; border-radius: 20px; }
        30%  { transform: scale(0.9) translateY(-20px); opacity: 0.9; }
        60%  { transform: scale(0.5) translateY(-80px); opacity: 0.6; border-radius: 50px; }
        100% { transform: scale(0.1) translateY(-200px); opacity: 0; border-radius: 50%; }
      }
      @keyframes modal-enter {
        0%   { opacity: 0; transform: scale(0.85) translateY(24px); }
        60%  { opacity: 1; transform: scale(1.02) translateY(-4px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes modal-exit {
        0%   { opacity: 1; transform: scale(1) translateY(0); }
        100% { opacity: 0; transform: scale(0.88) translateY(20px); }
      }
      @keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
      @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
      @keyframes timer-progress { from { width: 100%; } to { width: 0%; } }

      .rec-proceed-glow { animation: pulse-glow 3s ease-in-out infinite; }
      .strong-fit-shimmer {
        background: linear-gradient(90deg, #0F6E56 30%, #1D9E75 50%, #0F6E56 70%);
        background-size: 200% auto;
        animation: shimmer-bg 4s linear infinite;
        color: white;
        border-color: transparent !important;
      }

      .float-1 { animation: float 3.2s ease-in-out infinite; }
      .float-2 { animation: float 3.8s ease-in-out 0.6s infinite; }
      .float-3 { animation: float 3.5s ease-in-out 1.2s infinite; }
      .ring-fill-anim { animation: ring-fill 5s ease-out infinite; transform-origin: center; }
      .check-anim { animation: check-appear 5s ease-in-out 0.5s infinite; transform-origin: center; }

      .project-card { position: relative; overflow: hidden; transition: all 0.2s ease; }
      .project-card:hover {
        background-color: #E1F5EE !important;
        border: 1px solid #1D9E75 !important;
        border-left: 3px solid #1D9E75 !important;
        cursor: pointer;
      }

      /* Readability font size adjustments */
      body { font-size: 14px; }
      input, textarea, select, button { font-size: 14px; }

      .quote-close-btn:hover { background: rgba(0,0,0,0.35) !important; }

      @media (max-width: 768px) {
        .home-sidebar { display: none !important; }
        .login-illustration { display: none !important; }
        .login-outer { flex-direction: column !important; }
        .login-panel-left { width: 100% !important; height: 200px !important; }
        .login-panel-right { width: 100% !important; height: auto !important; flex: 1 !important; }
      }
    `}</style>
  )
}
