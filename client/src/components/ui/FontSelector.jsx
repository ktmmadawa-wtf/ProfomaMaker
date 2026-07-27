import { useTheme } from '../../context/ThemeContext';

export default function FontSelector() {
  const { fontKey, setFontKey, fonts } = useTheme();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {Object.entries(fonts).map(([key, font]) => {
        const isActive = fontKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setFontKey(key)}
            className={`relative rounded-xl p-3.5 text-left transition-all border-2 flex flex-col justify-between ${
              isActive
                ? 'border-blue-500 bg-slate-800/80 shadow-lg shadow-blue-500/20'
                : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  {font.name}
                </span>
                {isActive && (
                  <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </div>
              <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
                {font.description}
              </p>
            </div>

            {/* Live Font Sample Preview */}
            <div
              className="mt-2 p-2 rounded-lg bg-slate-900/60 border border-slate-700/40 text-xs"
              style={{ fontFamily: font.family }}
            >
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Proforma #PI-1002
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                10,925.00 SAR
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
