import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';

export default function InvoicePreviewModal({ invoice, onClose }) {
  const { api } = useAuth();
  const [settings, setSettings] = useState(null);
  const [matchedCustomer, setMatchedCustomer] = useState(null);
  const [langMode, setLangMode] = useState('bilingual'); // 'bilingual' | 'english' | 'arabic'

  useEffect(() => {
    Promise.all([
      api.get('/settings').catch(() => ({ data: null })),
      api.get('/customers').catch(() => ({ data: [] }))
    ]).then(([settRes, custRes]) => {
      if (settRes?.data) setSettings(settRes.data);
      if (custRes?.data && invoice?.company_name) {
        const found = custRes.data.find(
          c => c.company_name?.toLowerCase().trim() === invoice.company_name?.toLowerCase().trim()
        );
        if (found) setMatchedCustomer(found);
      }
    });
  }, [api, invoice]);

  if (!invoice) return null;

  // Handle items array
  let items = [];
  try {
    items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
  } catch {
    items = [];
  }

  // Helper for dynamic language translation
  const t = (enText, arText) => {
    if (langMode === 'english') return enText;
    if (langMode === 'arabic') return arText;
    return `${enText} / ${arText}`;
  };

  // Helper for numeric formatting (converts 0-9 to Eastern Arabic digits ٠-٩ in Arabic-only mode)
  const formatNum = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (langMode === 'arabic') {
      return str.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
    }
    return str;
  };

  // Helper for table header cells in bilingual vs single language
  const renderTh = (enText, arText, alignClass = 'text-left') => {
    if (langMode === 'bilingual') {
      return (
        <th className={`p-2.5 border-b ${alignClass}`}>
          <div className="font-semibold">{enText}</div>
          <div className="text-[10px] text-slate-300 font-normal normal-case tracking-normal" dir="rtl">{arText}</div>
        </th>
      );
    }
    return (
      <th className={`p-3 border-b ${alignClass}`}>
        {langMode === 'arabic' ? arText : enText}
      </th>
    );
  };

  // Helper for summary total rows with English Left & Arabic Right in bilingual mode
  const renderTotalRow = (enLabel, arLabel, rawValue, isBold = false, isHighlight = false, colorClass = '') => {
    let rawNumStr = '';
    if (typeof rawValue === 'number') {
      rawNumStr = rawValue.toFixed(2);
    } else if (typeof rawValue === 'string') {
      rawNumStr = rawValue.replace(/\s*SAR\s*/i, '').trim();
    }

    const numStr = formatNum(rawNumStr);
    const formattedArLabel = formatNum(arLabel);
    const currencyStr = langMode === 'arabic' ? 'ر.س' : 'SAR';

    if (langMode === 'bilingual') {
      return (
        <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-1 text-xs leading-tight ${isBold ? 'font-bold border-t border-slate-300 pt-2 mt-1' : ''} ${colorClass || (isBold ? 'text-slate-900' : 'text-slate-700')}`}>
          <span className="text-left font-medium whitespace-nowrap">{enLabel}</span>
          <div className={`font-mono flex items-center justify-end gap-1.5 min-w-[135px] whitespace-nowrap px-1 ${isHighlight ? 'text-blue-950 font-bold text-sm' : ''}`}>
            <span className="text-right flex-1">{numStr}</span>
            <span className="text-[11px] font-normal text-slate-500 font-sans w-8 text-right flex-shrink-0">SAR</span>
          </div>
          <span className="text-right font-medium whitespace-nowrap" dir="rtl">{arLabel}</span>
        </div>
      );
    }

    if (langMode === 'arabic') {
      return (
        <div className={`flex justify-between items-center gap-4 py-1 text-xs leading-tight ${isBold ? 'font-bold border-t border-slate-300 pt-2 mt-1' : ''} ${colorClass || (isBold ? 'text-slate-900' : 'text-slate-600')}`}>
          <div className={`font-mono flex items-center justify-end gap-1.5 min-w-[135px] whitespace-nowrap ${isHighlight ? 'text-blue-950 font-bold text-sm' : ''}`}>
            <span className="text-right flex-1">{numStr}</span>
            <span className="text-xs font-normal text-slate-500 font-sans min-w-[28px] text-right flex-shrink-0" dir="rtl">{currencyStr}</span>
          </div>
          <span className="whitespace-nowrap" dir="rtl">:{formattedArLabel}</span>
        </div>
      );
    }

    return (
      <div className={`flex justify-between items-center gap-4 py-1 text-xs leading-tight ${isBold ? 'font-bold border-t border-slate-300 pt-2 mt-1' : ''} ${colorClass || (isBold ? 'text-slate-900' : 'text-slate-600')}`}>
        <span className="whitespace-nowrap">{enLabel}:</span>
        <div className={`font-mono flex items-center justify-end gap-1.5 min-w-[135px] whitespace-nowrap ${isHighlight ? 'text-blue-950 font-bold text-sm' : ''}`}>
          <span className="text-right flex-1">{numStr}</span>
          <span className="text-[11px] font-normal text-slate-500 font-sans w-8 text-right flex-shrink-0">{currencyStr}</span>
        </div>
      </div>
    );
  };

  // Customer details
  const contactPerson = invoice.contact_person || matchedCustomer?.contact_person || '';
  const address1 = invoice.address_1 || matchedCustomer?.address_1 || '';
  const address2 = invoice.address_2 || matchedCustomer?.address_2 || '';
  const address3 = invoice.address_3 || matchedCustomer?.address_3 || '';
  const city = invoice.city || matchedCustomer?.city || '';
  const country = invoice.country || matchedCustomer?.country || '';
  const customerVat = invoice.customer_vat || matchedCustomer?.vat_number || '';

  // Hotel settings
  const hotelName = settings?.hotel_name || 'Lotus Palace Hotel';
  const hotelAddr1 = settings?.address_1 || 'Olaya District, King Fahd Road';
  const hotelAddr2 = settings?.address_2 || 'PO Box 12345';
  const hotelCity = settings?.city || 'Riyadh';
  const hotelCountry = settings?.country || 'Saudi Arabia';
  const phone = settings?.phone || '+966 11 456 7890';
  const email = settings?.email || 'reservations@lotuspalace.com';
  const website = settings?.website || 'www.lotuspalace.com';
  const vatNumber = settings?.vat_number || '310123456700003';
  const bankName = settings?.bank_name || '';
  const accountName = settings?.account_name || '';
  const accountNumber = settings?.account_number || '';
  const ibanNumber = settings?.iban_number || '';
  const swiftCode = settings?.swift_code || '';
  const paymentTerms = settings?.payment_terms || 'Please make payment within 7 days of invoice date.';
  const hotelLogo = settings?.hotel_logo || '';
  const hotelStamp = settings?.hotel_stamp || '';

  const printTimestamp = new Date().toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Sanitizes invoice number and company name for PDF filename format: PI-{invoiceNumber} {companyName}.pdf
  const sanitizePdfFileName = (invoiceNum, company) => {
    const rawNum = String(invoiceNum || '').replace(/^PI-?/i, '').trim();
    const rawCompany = String(company || '').trim();

    // Combine format
    let name = `PI-${rawNum} ${rawCompany}`;

    // Remove forbidden characters: \ / : * ? " < > |
    name = name.replace(/[\\\/:\*\?"<>\|]/g, '-');

    // Replace multiple spaces or hyphens cleanly
    name = name.replace(/\s+/g, ' ').replace(/-+/g, '-').trim();

    return name;
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const pdfFileName = sanitizePdfFileName(invoice.invoice_number, invoice.company_name);

    document.title = pdfFileName;
    window.print();

    // Restore original document title after print dialog opens/closes
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const isRtl = langMode === 'arabic';

  return createPortal(
    <div className="printable-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto">

      {/* Modal Container */}
      <div className="printable-modal-card bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:bg-white print:rounded-none">

        {/* Modal Top Bar (hidden on print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="badge badge-blue text-sm font-mono">{invoice.invoice_number}</span>
            <span className="text-slate-300 text-sm font-medium">{invoice.company_name}</span>
          </div>

          {/* Language Mode Switcher */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setLangMode('bilingual')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${langMode === 'bilingual'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              🌐 Bilingual (En / Ar)
            </button>
            <button
              onClick={() => setLangMode('english')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${langMode === 'english'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              🇬🇧 English Only
            </button>
            <button
              onClick={() => setLangMode('arabic')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${langMode === 'arabic'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              🇸🇦 العربية
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="btn-primary px-4 py-2 text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="btn-ghost px-3 py-2 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Proforma Sheet */}
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className={`printable-invoice overflow-y-auto p-8 sm:p-12 bg-white text-slate-900 print:p-0 print:overflow-visible flex-1 ${isRtl ? 'text-right font-sans' : 'text-left'
            }`}
        >

          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div className="space-y-1">
              {hotelLogo ? (
                <img src={hotelLogo} alt={hotelName} className="h-16 object-contain mb-2" />
              ) : (
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{hotelName}</h1>
              )}
              <p className="text-xs text-slate-600">{hotelAddr1}{hotelAddr2 ? `, ${hotelAddr2}` : ''}</p>
              <p className="text-xs text-slate-600">{hotelCity}, {hotelCountry}</p>
              <p className="text-xs text-slate-600">Tel: {phone} | Email: {email}</p>
              {website && <p className="text-xs text-slate-600">{website}</p>}
              <div className="text-xs font-semibold text-slate-800 mt-1">
                {langMode === 'bilingual' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">VAT Reg No:</span>
                    <span className="font-mono font-bold text-slate-900">{vatNumber}</span>
                    <span className="text-slate-500 font-medium" dir="rtl">:الرقم الضريبي</span>
                  </div>
                ) : (
                  <p>{t('VAT Reg No', 'الرقم الضريبي')}: <span className="font-mono">{vatNumber}</span></p>
                )}
              </div>
            </div>

            <div className={isRtl ? 'text-left space-y-1' : 'text-right space-y-1'}>
              <div className="inline-block bg-slate-900 text-white font-bold px-4 py-1.5 rounded text-sm uppercase tracking-wider mb-2">
                {langMode === 'bilingual' ? (
                  <div className="flex items-center gap-2">
                    <span>PROFORMA INVOICE</span>
                    <span className="text-slate-400">|</span>
                    <span dir="rtl" className="font-sans">فاتورة شكلية</span>
                  </div>
                ) : langMode === 'arabic' ? (
                  'فاتورة شكلية'
                ) : (
                  'PROFORMA INVOICE'
                )}
              </div>
              <div className="pt-2 text-xs space-y-1">
                {langMode === 'bilingual' ? (
                  <>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-slate-500 font-medium">Invoice No:</span>
                      <strong className="font-mono text-slate-900">{invoice.invoice_number}</strong>
                      <span className="text-slate-500 font-medium" dir="rtl">:رقم الفاتورة</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-slate-500 font-medium">Date:</span>
                      <strong className="text-slate-900">{invoice.invoice_date}</strong>
                      <span className="text-slate-500 font-medium" dir="rtl">:التاريخ</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-slate-500 font-medium">Type:</span>
                      <strong className="capitalize text-slate-900 text-center">
                        {invoice.invoice_type === 'room'
                          ? 'Room Stay / إقامة غرف'
                          : invoice.invoice_type === 'event'
                            ? 'Event / مناسبات وقاعات'
                            : 'Miscellaneous / خدمات متنوعة'}
                      </strong>
                      <span className="text-slate-500 font-medium" dir="rtl">:النوع</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p><span className="text-slate-500">{t('Invoice No', 'رقم الفاتورة')}:</span> <strong className="font-mono text-slate-900">{invoice.invoice_number}</strong></p>
                    <p><span className="text-slate-500">{t('Date', 'التاريخ')}:</span> <strong className="text-slate-900">{invoice.invoice_date}</strong></p>
                    <p>
                      <span className="text-slate-500">{t('Type', 'النوع')}:</span>{' '}
                      <strong className="capitalize text-slate-900">
                        {invoice.invoice_type === 'room'
                          ? t('Room Stay', 'إقامة غرف')
                          : invoice.invoice_type === 'event'
                            ? t('Event', 'مناسبات وقاعات')
                            : t('Miscellaneous', 'خدمات متنوعة')}
                      </strong>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Customer / Billed To Section */}
          <div className="my-6 grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider">
                  {langMode === 'bilingual' ? 'Billed To' : t('Billed To', 'السادة')}
                </span>
                {langMode === 'bilingual' && (
                  <span className="font-bold text-slate-500 uppercase tracking-wider" dir="rtl">
                    السادة
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-slate-900">{invoice.company_name}</p>
              {contactPerson && (
                <div className="flex justify-between items-center text-slate-700 font-medium mt-1">
                  <span>Attn: {contactPerson}</span>
                  {langMode === 'bilingual' ? (
                    <span dir="rtl">:عناية</span>
                  ) : langMode === 'arabic' ? (
                    <span dir="rtl">:عناية</span>
                  ) : null}
                </div>
              )}
              <div className="text-slate-600 mt-1 space-y-0.5">
                {address1 && <p>{address1}</p>}
                {address2 && <p>{address2}</p>}
                {address3 && <p>{address3}</p>}
                {city && <p>{city}</p>}
                {country && <p>{country}</p>}
              </div>
            </div>
            <div className={isRtl ? 'text-left space-y-1' : 'text-right space-y-1'}>
              {customerVat && (
                langMode === 'bilingual' ? (
                  <div className="flex justify-end gap-3 items-center text-xs">
                    <span className="text-slate-500">Customer VAT No:</span>
                    <strong className="font-mono text-slate-900">{customerVat}</strong>
                    <span className="text-slate-500" dir="rtl">:الرقم الضريبي للعميل</span>
                  </div>
                ) : (
                  <p>
                    <span className="text-slate-500">{t('Customer VAT No', 'الرقم الضريبي للعميل')}:</span>{' '}
                    <strong className="font-mono text-slate-900">{customerVat}</strong>
                  </p>
                )
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="my-6 overflow-hidden border border-slate-300 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold uppercase tracking-wider">
                  {renderTh('Description', 'البيان', isRtl ? 'text-right' : 'text-left')}
                  {invoice.invoice_type === 'room' && (
                    <>
                      {renderTh('Arrival', 'الوصول', 'text-center')}
                      {renderTh('Departure', 'المغادرة', 'text-center')}
                      {renderTh('Nights', 'الليالي', 'text-center')}
                      {renderTh('Rate (SAR)', 'السعر (ر.س)', isRtl ? 'text-left' : 'text-right')}
                    </>
                  )}
                  {invoice.invoice_type === 'event' && (
                    <>
                      {renderTh('Start', 'البداية', 'text-center')}
                      {renderTh('End', 'النهاية', 'text-center')}
                      {renderTh('Days', 'الأيام', 'text-center')}
                      {renderTh('Pax', 'الأشخاص', 'text-center')}
                      {renderTh('Per Pax', 'للفرد', isRtl ? 'text-left' : 'text-right')}
                      {renderTh('Rental', 'الإيجار', isRtl ? 'text-left' : 'text-right')}
                    </>
                  )}
                  {invoice.invoice_type === 'misc' && (
                    <>
                      {renderTh('Start', 'البداية', 'text-center')}
                      {renderTh('End', 'النهاية', 'text-center')}
                      {renderTh('Days', 'الأيام', 'text-center')}
                      {renderTh('Qty', 'الكمية', 'text-center')}
                      {renderTh('Unit Price', 'سعر الوحدة', isRtl ? 'text-left' : 'text-right')}
                    </>
                  )}
                  {renderTh('Total (SAR)', 'الإجمالي (ر.س)', isRtl ? 'text-left' : 'text-right')}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className={`p-3 font-medium whitespace-pre-line ${isRtl ? 'text-right' : 'text-left'}`}>{item.description || '—'}</td>

                    {invoice.invoice_type === 'room' && (
                      <>
                        <td className="p-3 text-center text-slate-600">{formatNum(item.arrival) || '—'}</td>
                        <td className="p-3 text-center text-slate-600">{formatNum(item.departure) || '—'}</td>
                        <td className="p-3 text-center font-mono">{formatNum(item.nights || '0')}</td>
                        <td className={`p-3 font-mono ${isRtl ? 'text-left' : 'text-right'}`}>{formatNum(parseFloat(item.rate || 0).toFixed(2))}</td>
                      </>
                    )}

                    {invoice.invoice_type === 'event' && (
                      <>
                        <td className="p-3 text-center text-slate-600">{formatNum(item.start_date) || '—'}</td>
                        <td className="p-3 text-center text-slate-600">{formatNum(item.end_date) || '—'}</td>
                        <td className="p-3 text-center font-mono">{formatNum(item.days || '1')}</td>
                        <td className="p-3 text-center font-mono">{formatNum(item.pax || '0')}</td>
                        <td className={`p-3 font-mono ${isRtl ? 'text-left' : 'text-right'}`}>{formatNum(parseFloat(item.pax_charge || 0).toFixed(2))}</td>
                        <td className={`p-3 font-mono ${isRtl ? 'text-left' : 'text-right'}`}>{formatNum(parseFloat(item.rental || 0).toFixed(2))}</td>
                      </>
                    )}

                    {invoice.invoice_type === 'misc' && (
                      <>
                        <td className="p-3 text-center text-slate-600">{formatNum(item.start_date) || '—'}</td>
                        <td className="p-3 text-center text-slate-600">{formatNum(item.end_date) || '—'}</td>
                        <td className="p-3 text-center font-mono">{formatNum(item.days || '1')}</td>
                        <td className="p-3 text-center font-mono">{formatNum(item.quantity || '0')}</td>
                        <td className={`p-3 font-mono ${isRtl ? 'text-left' : 'text-right'}`}>{formatNum(parseFloat(item.unit_price || 0).toFixed(2))}</td>
                      </>
                    )}

                    <td className={`p-3 font-mono font-bold text-slate-900 ${isRtl ? 'text-left' : 'text-right'}`}>
                      {formatNum(parseFloat(item.total || 0).toFixed(2))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary & Totals */}
          <div className={`flex my-6 ${isRtl ? 'justify-start' : 'justify-end'}`}>
            <div className={`w-full bg-slate-50 p-4 rounded-lg border border-slate-200 ${langMode === 'bilingual' ? 'max-w-[440px]' : 'max-w-[380px]'}`}>
              {renderTotalRow('Subtotal', 'المجموع الفرعي', parseFloat(invoice.subtotal))}

              {parseFloat(invoice.discount_amount) > 0 &&
                renderTotalRow(
                  `Discount (${invoice.discount_percent}%)`,
                  `خصم (${invoice.discount_percent}%)`,
                  `-${parseFloat(invoice.discount_amount).toFixed(2)}`,
                  false,
                  false,
                  'text-red-600'
                )
              }

              {parseFloat(invoice.municipality_fee) > 0 &&
                renderTotalRow('Municipality Fee (5%)', 'رسوم البلدية (5%)', parseFloat(invoice.municipality_fee))
              }

              {renderTotalRow('VAT (15%)', 'ضريبة القيمة المضافة (15%)', parseFloat(invoice.vat_total))}

              {renderTotalRow('Grand Total', 'الإجمالي الكلي', parseFloat(invoice.grand_total), true, true)}

              {parseFloat(invoice.advance_payment) > 0 && (
                <>
                  {renderTotalRow(
                    'Advance Payment',
                    'الدفعة المقدمة',
                    `-${parseFloat(invoice.advance_payment).toFixed(2)}`,
                    false,
                    false,
                    'text-green-700'
                  )}
                  {renderTotalRow(
                    'Balance Due',
                    'المبلغ المتبقي',
                    parseFloat(invoice.balance_due),
                    true,
                    false,
                    'text-red-700'
                  )}
                </>
              )}
            </div>
          </div>

          {/* Bank & Payment Information */}
          <div className="my-6 grid grid-cols-2 gap-6 text-xs border-t border-slate-200 pt-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-800 uppercase tracking-wider">
                  {langMode === 'bilingual' ? 'Bank Payment Details' : t('Bank Payment Details', 'تفاصيل الحساب البنكي')}
                </span>
                {langMode === 'bilingual' && (
                  <span className="font-bold text-slate-800 uppercase tracking-wider" dir="rtl">
                    تفاصيل الحساب البنكي
                  </span>
                )}
              </div>

              {bankName && (
                langMode === 'bilingual' ? (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500">Bank Name:</span>
                    <strong className="text-slate-900 text-center">{bankName}</strong>
                    <span className="text-slate-500" dir="rtl">:اسم البنك</span>
                  </div>
                ) : (
                  <p><span className="text-slate-500">{t('Bank Name', 'اسم البنك')}:</span> <strong>{bankName}</strong></p>
                )
              )}

              {accountName && (
                langMode === 'bilingual' ? (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500">Account Name:</span>
                    <strong className="text-slate-900 text-center">{accountName}</strong>
                    <span className="text-slate-500" dir="rtl">:اسم الحساب</span>
                  </div>
                ) : (
                  <p><span className="text-slate-500">{t('Account Name', 'اسم الحساب')}:</span> <strong>{accountName}</strong></p>
                )
              )}

              {accountNumber && (
                langMode === 'bilingual' ? (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500">Account No:</span>
                    <strong className="font-mono text-slate-900 text-center">{accountNumber}</strong>
                    <span className="text-slate-500" dir="rtl">:رقم الحساب</span>
                  </div>
                ) : (
                  <p><span className="text-slate-500">{t('Account No', 'رقم الحساب')}:</span> <strong className="font-mono">{accountNumber}</strong></p>
                )
              )}

              {ibanNumber && (
                langMode === 'bilingual' ? (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500">IBAN:</span>
                    <strong className="font-mono text-slate-900 text-center">{ibanNumber}</strong>
                    <span className="text-slate-500" dir="rtl">:الآيبان</span>
                  </div>
                ) : (
                  <p><span className="text-slate-500">{t('IBAN', 'الآيبان')}:</span> <strong className="font-mono">{ibanNumber}</strong></p>
                )
              )}

              {swiftCode && (
                langMode === 'bilingual' ? (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500">SWIFT:</span>
                    <strong className="font-mono text-slate-900 text-center">{swiftCode}</strong>
                    <span className="text-slate-500" dir="rtl">:رمز السويفت</span>
                  </div>
                ) : (
                  <p><span className="text-slate-500">{t('SWIFT', 'رمز السويفت')}:</span> <strong className="font-mono">{swiftCode}</strong></p>
                )
              )}
            </div>

            <div className={isRtl ? 'text-left flex flex-col justify-between' : 'text-right flex flex-col justify-between'}>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800 uppercase tracking-wider">
                    {langMode === 'bilingual' ? 'Terms & Conditions' : t('Terms & Conditions', 'الشروط والأحكام')}
                  </span>
                  {langMode === 'bilingual' && (
                    <span className="font-bold text-slate-800 uppercase tracking-wider" dir="rtl">
                      الشروط والأحكام
                    </span>
                  )}
                </div>
                <p className="text-slate-600 italic">{paymentTerms}</p>
              </div>

              <div className={`pt-8 flex gap-6 items-end ${isRtl ? 'justify-start' : 'justify-end'}`}>
                {hotelStamp && (
                  <img src={hotelStamp} alt="Stamp" className="h-16 object-contain opacity-80" />
                )}
                <div className="border-t border-slate-400 w-44 text-center pt-1 text-[10px] text-slate-500 uppercase tracking-wider">
                  {langMode === 'bilingual' ? (
                    <div>
                      <div>Authorized Signature</div>
                      <div dir="rtl" className="text-slate-400 font-normal">التوقيع المعتمد</div>
                    </div>
                  ) : (
                    t('Authorized Signature', 'التوقيع المعتمد')
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note & Print Footer */}
          <div className="print-footer border-t border-slate-200 pt-3 mt-6 flex justify-between items-center text-[10px] text-slate-500">
            {langMode === 'bilingual' ? (
              <div className="space-y-0.5">
                <div>This is a computer-generated proforma invoice and is valid without physical signature. | {hotelName}</div>
                <div dir="rtl" className="text-slate-400">هذه فاتورة شكلية صادرة عن الحاسب الآلي وصالحة بدون توقيع خطي. | {hotelName}</div>
              </div>
            ) : (
              <div>
                {t(
                  `This is a computer-generated proforma invoice and is valid without physical signature. | ${hotelName}`,
                  `هذه فاتورة شكلية صادرة عن الحاسب الآلي وصالحة بدون توقيع خطي. | ${hotelName}`
                )}
              </div>
            )}
            <div className="font-mono text-slate-600">
              {printTimestamp}
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}

