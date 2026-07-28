import { useState, useEffect, useRef, useMemo } from 'react';
import { getCustomersFromIDB, saveCustomersToIDB } from '../../utils/idb';

// Helper to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Render text with highlighted matching substring/character sequences
function HighlightMatch({ text, query }) {
  if (!query || !text) return <span>{text}</span>;

  const trimmed = query.trim();
  if (!trimmed) return <span>{text}</span>;

  // Split query into terms or use regex match for substring
  const regex = new RegExp(`(${escapeRegExp(trimmed)})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-blue-500/30 text-blue-200 font-bold px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}

export default function CustomerAutocomplete({
  value = '',
  onChange,
  onSelectCustomer,
  customers = [],
  placeholder = 'Search customer or company name…',
  required = false,
  className = ''
}) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [localCustomers, setLocalCustomers] = useState(customers);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync external prop changes to local query
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Sync prop customers & cache in IndexedDB
  useEffect(() => {
    if (customers && customers.length > 0) {
      setLocalCustomers(customers);
      saveCustomersToIDB(customers);
    } else {
      // Try fallback load from IndexedDB
      getCustomersFromIDB().then(cached => {
        if (cached && cached.length > 0) {
          setLocalCustomers(cached);
        }
      });
    }
  }, [customers]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter & score matching customers based on query
  const suggestions = useMemo(() => {
    if (!query || !query.trim()) return [];
    const q = query.toLowerCase().trim();

    return localCustomers
      .filter(c => {
        const company = (c.company_name || '').toLowerCase();
        const contact = (c.contact_person || '').toLowerCase();
        const vat = (c.vat_number || '').toLowerCase();
        // Match prefix, mid-text, suffix or any substring anywhere in name/contact/vat
        return company.includes(q) || contact.includes(q) || vat.includes(q);
      })
      .slice(0, 10); // Limit top 10 suggestions for performance & clean UI
  }, [query, localCustomers]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onChange) onChange(val);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = (customer) => {
    if (!customer) return;
    setQuery(customer.company_name || '');
    if (onChange) onChange(customer.company_name || '');
    if (onSelectCustomer) onSelectCustomer(customer);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleClear = () => {
    setQuery('');
    if (onChange) onChange('');
    setIsOpen(false);
    setActiveIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        {/* Search Bar Icon */}
        <svg
          className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className="bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-8 py-2 text-white text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400 transition"
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 text-slate-400 hover:text-white rounded-full focus:outline-none"
            title="Clear input"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Google Search Bar Style Suggestion Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-700/50 backdrop-blur-md">
          {suggestions.map((c, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={c.id || index}
                onClick={() => handleSelect(c)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`px-4 py-2.5 cursor-pointer flex items-center justify-between text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-200 hover:bg-slate-700/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isActive ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {c.company_name ? c.company_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div className="truncate">
                    <p className="font-medium truncate">
                      <HighlightMatch text={c.company_name} query={query} />
                    </p>
                    {c.contact_person && (
                      <p className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                        Contact: <HighlightMatch text={c.contact_person} query={query} />
                      </p>
                    )}
                  </div>
                </div>

                {c.vat_number && (
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded ml-2 flex-shrink-0 ${
                      isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    VAT: <HighlightMatch text={c.vat_number} query={query} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No results message */}
      {isOpen && query && query.trim() && suggestions.length === 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-center text-xs text-slate-400 shadow-xl">
          No matching customer found for "{query}"
        </div>
      )}
    </div>
  );
}
