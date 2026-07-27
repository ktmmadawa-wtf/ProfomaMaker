import { useTheme } from '../../context/ThemeContext';

const SWATCHES = {
  original:  ['#0f172a', '#2563eb', '#1e293b'],
  neo_white: ['#ffffff', '#2563eb', '#f1f5f9'],
  midnight:  ['#0b132b', '#38bdf8', '#1c2541'],
  desert:    ['#1c130e', '#f97316', '#2a1d17'],
  emerald:   ['#061a14', '#10b981', '#0b2920'],
  slate_pro: ['#18181b', '#f9703e', '#27272a'],
};

export default function ThemeSelector() {
  const { themeKey, setThemeKey, themes } = useTheme();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Object.entries(themes).map(([key, theme]) => {
        const [bg, accent, secondary] = SWATCHES[key] || ['#1e293b', '#2563eb', '#334155'];
        const isActive = themeKey === key;
        const isLight = key === 'neo_white';
        return (
          <button
            key={key}
            onClick={() => setThemeKey(key)}
            className={`relative rounded-xl p-3 text-left transition-all border-2 ${
              isActive
                ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                : 'border-transparent hover:border-slate-500'
            }`}
            style={{ backgroundColor: bg }}
          >
            {/* Mini preview swatches */}
            <div className="flex gap-1.5 mb-2">
              <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: bg }} />
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: accent }} />
              <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: secondary }} />
            </div>
            <p className="text-xs font-semibold truncate" style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
              {theme.name}
            </p>
            {isActive && (
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
