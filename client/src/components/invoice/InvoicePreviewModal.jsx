import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';

export default function InvoicePreviewModal({ invoice, onClose }) {
  const { api } = useAuth();
  const [settings, setSettings]               = useState(null);
  const [matchedCustomer, setMatchedCustomer] = useState(null);
  const [langMode, setLangMode]               = useState('bilingual'); // 'bilingual' | 'english' | 'arabic'

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

  // Customer details
  const contactPerson = invoice.contact_person || matchedCustomer?.contact_person || '';
  const address1      = invoice.address_1      || matchedCustomer?.address_1      || '';
  const address2      = invoice.address_2      || matchedCustomer?.address_2      || '';
  const address3      = invoice.address_3      || matchedCustomer?.address_3      || '';
  const city          = invoice.city           || matchedCustomer?.city           || '';
  const country       = invoice.country        || matchedCustomer?.country        || '';
  const customerVat   = invoice.customer_vat   || matchedCustomer?.vat_number     || '';

  // Hotel settings
  const hotelName      = settings?.hotel_name     || 'Lotus Palace Hotel';
  const hotelAddr1     = settings?.address_1      || 'Olaya District, King Fahd Road';
  const hotelAddr2     = settings?.address_2      || 'PO Box 12345';
  const hotelCity      = settings?.city           || 'Riyadh';
  const hotelCountry   = settings?.country        || 'Saudi Arabia';
  const phone          = settings?.phone          || '+966 11 456 7890';
  const email          = settings?.email          || 'reservations@lotuspalace.com';
  const website        = settings?.website        || 'www.lotuspalace.com';
  const vatNumber      = settings?.vat_number     || '310123456700003';
  const bankName       = settings?.bank_name      || '';
  const accountName    = settings?.account_name   || '';
  const accountNumber  = settings?.account_number || '';
  const ibanNumber     = settings?.iban_number    || '';
  const swiftCode      = settings?.swift_code     || '';
  const paymentTerms   = settings?.payment_terms  || 'Please make payment within 7 days of invoice date.';
  const hotelLogo      = settings?.hotel_logo     || '';
  const hotelStamp     = settings?.hotel_stamp    || '';

  const printTimestamp = new Date().toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const handlePrint = () => {
    window.print();
  };

  const isRtl = langMode === 'arabic';

  return createPortal(
    <div className="printable-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Modal Container */}
      <div className="printable-modal-card bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:bg-white print:rounded-none">
        
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
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                langMode === 'bilingual'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌐 Bilingual (En / Ar)
            </button>
            <button
              onClick={() => setLangMode('english')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                langMode === 'english'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇬🇧 English Only
            </button>
            <button
              onClick={() => setLangMode('arabic')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                langMode === 'arabic'
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
          className={`printable-invoice overflow-y-auto p-8 sm:p-12 bg-white text-slate-900 print:p-0 print:overflow-visible flex-1 ${
            isRtl ? 'text-right font-sans' : 'text-left'
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
              <p className="text-xs font-semibold text-slate-800 mt-1">
                {t('VAT Reg No', 'الرقم الضريبي')}: <span className="font-mono">{vatNumber}</span>
              </p>
            </div>

            <div className={isRtl ? 'text-left space-y-1' : 'text-right space-y-1'}>
              <div className="inline-block bg-slate-900 text-white font-bold px-4 py-1.5 rounded text-sm uppercase tracking-wider mb-2">
                {langMode === 'bilingual'
                  ? 'PROFORMA INVOICE / فاتورة شكلية'
                  : langMode === 'arabic'
                  ? 'فاتورة شكلية'
                  : 'PROFORMA INVOICE'}
              </div>
              <div className="pt-2 text-xs space-y-0.5">
                <p><span className="text-slate-500">{t('Invoice No', 'رقم الفاتورة')}:</span> <strong className="font-mono text-slate-900">{invoice.invoice_number}</strong></p>
                <p><span className="text-slate-500">{t('Date', 'التاريخ')}:</span> <strong className="text-slate-900">{invoice.invoice_date}</strong></p>
                <p>
                  <span className="text-slate-500">{t('Type', 'النوع')}:</span>{' '}
                  <strong className="capitalize text-slate-900">
                    {invoice.invoice_type === 'room'
                      ? t('Room Stay', 'إقامة غرف')
                      : invoice.invoice_type === 'event'
                      ? t('Event', 'مناسبة / قاعة')
                      : t('Miscellaneous', 'خدمات متنوعة')}
                  </strong>
                </p>
              </div>
            </div>
          </div>

          {/* Customer / Billed To Section */}
          <div className="my-6 grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div>
              <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">
                {t('Billed To', 'السادة')}
              </p>
              <p className="text-sm font-bold text-slate-900">{invoice.company_name}</p>
              {contactPerson && <p className="text-slate-700 font-medium mt-0.5">{t('Attn', 'عناية')}: {contactPerson}</p>}
              <div className="text-slate-600 mt-0.5 space-y-0.5">
                {address1 && <p>{address1}</p>}
                {address2 && <p>{address2}</p>}
                {address3 && <p>{address3}</p>}
                {city     && <p>{city}</p>}
                {country  && <p>{country}</p>}
              </div>
            </div>
            <div className={isRtl ? 'text-left space-y-1' : 'text-right space-y-1'}>
              {customerVat && (
                <p>
                  <span className="text-slate-500">{t('Customer VAT No', 'الرقم الضريبي للعميل')}:</span>{' '}
                  <strong className="font-mono text-slate-900">{customerVat}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="my-6 overflow-hidden border border-slate-300 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold uppercase tracking-wider">
                  <th className={`p-3 border-b ${isRtl ? 'text-right' : 'text-left'}`}>{t('Description', 'البيان')}</th>
                  {invoice.invoice_type === 'room' && (
                    <>
                      <th className="p-3 border-b text-center">{t('Arrival', 'الوصول')}</th>
                      <th className="p-3 border-b text-center">{t('Departure', 'المغادرة')}</th>
                      <th className="p-3 border-b text-center">{t('Nights', 'الليالي')}</th>
                      <th className={`p-3 border-b ${isRtl ? 'text-left' : 'text-right'}`}>{t('Rate', 'السعر')} (SAR)</th>
                    </>
                  )}
                  {invoice.invoice_type === 'event' && (
                    <>
                      <th className="p-3 border-b text-center">{t('Start', 'البداية')}</th>
                      <th className="p-3 border-b text-center">{t('End', 'النهاية')}</th>
                      <th className="p-3 border-b text-center">{t('Pax', 'الأشخاص')}</th>
                      <th className={`p-3 border-b ${isRtl ? 'text-left' : 'text-right'}`}>{t('Per Pax', 'للفرد')}</th>
                      <th className={`p-3 border-b ${isRtl ? 'text-left' : 'text-right'}`}>{t('Rental', 'الإيجار')}</th>
                    </>
                  )}
                  {invoice.invoice_type === 'misc' && (
                    <>
                      <th className="p-3 border-b text-center">{t('Qty', 'الكمية')}</th>
                      <th className={`p-3 border-b ${isRtl ? 'text-left' : 'text-right'}`}>{t('Unit Price', 'سعر الوحدة')}</th>
                    </>
                  )}
                  <th className={`p-3 border-b ${isRtl ? 'text-left' : 'text-right'}`}>{t('Total', 'الإجمالي')} (SAR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className={`p-3 font-medium ${isRtl ? 'text-right' : 'text-left'}`}>{item.description || '—'}</td>
                    
                    {invoice.invoice_type === 'room' && (
                      <>
                        <td className="p-3 text-center text-slate-600">{item.arrival || '—'}</td>
                        <td className="p-3 text-center text-slate-600">{item.departure || '—'}</td>
                        <td className="p-3 text-center font-mono">{item.nights || '0'}</td>
                        <td className={`p-3 font-mono ${isRtl ? 'text-left' : 'text-right'}`}>{parseFloat(item.rate || 0).toFixed(2)}</td>
                      </>
                    )}

                    {invoice.invoice_type === 'event' && (
                      <>
                        <td className="p-3 text-center text-slate-600">{item.start_date || '—'}</td>
                        <td className="p-3 text-center text-slate-600">{item.end_date || '—'}</td>
                        <td className="p-3 text-center font-mono">{item.pax || '0'}</td>
                        <td className={`p-3 font-mono ${isRtl ? 'text-left' : 'text-right'}`}>{parseFloat(item.pax_charge || 0).toFixed(2)}</td>
                        <td className={`p-3 font-mono ${isRtl ? 'text-left' : 'text-right'}`}>{parseFloat(item.rental || 0).toFixed(2)}</td>
                      </>
                    )}

                    {invoice.invoice_type === 'misc' && (
                      <>
                        <td className="p-3 text-center font-mono">{item.quantity || '0'}</td>
                        <td className={`p-3 font-mono ${isRtl ? 'text-left' : 'text-right'}`}>{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                      </>
                    )}

                    <td className={`p-3 font-mono font-bold text-slate-900 ${isRtl ? 'text-left' : 'text-right'}`}>
                      {parseFloat(item.total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary & Totals */}
          <div className={`flex my-6 ${isRtl ? 'justify-start' : 'justify-end'}`}>
            <div className="w-full max-w-xs space-y-1.5 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>{t('Subtotal', 'المجموع الفرعي')}:</span>
                <span className="font-mono font-medium">{parseFloat(invoice.subtotal).toFixed(2)} SAR</span>
              </div>

              {parseFloat(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>{t(`Discount (${invoice.discount_percent}%)`, `خصم (${invoice.discount_percent}%)`)}:</span>
                  <span className="font-mono">-{parseFloat(invoice.discount_amount).toFixed(2)} SAR</span>
                </div>
              )}

              {parseFloat(invoice.municipality_fee) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>{t('Municipality Fee (5%)', 'رسوم البلدية (5%)')}:</span>
                  <span className="font-mono">{parseFloat(invoice.municipality_fee).toFixed(2)} SAR</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>{t('VAT (15%)', 'ضريبة القيمة المضافة (15%)')}:</span>
                <span className="font-mono font-medium">{parseFloat(invoice.vat_total).toFixed(2)} SAR</span>
              </div>

              <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-300 pt-2 mt-2">
                <span>{t('Grand Total', 'الإجمالي الكلي')}:</span>
                <span className="font-mono text-blue-950">{parseFloat(invoice.grand_total).toFixed(2)} SAR</span>
              </div>

              {parseFloat(invoice.advance_payment) > 0 && (
                <>
                  <div className="flex justify-between text-green-700">
                    <span>{t('Advance Payment', 'الدفعة المقدمة')}:</span>
                    <span className="font-mono">-{parseFloat(invoice.advance_payment).toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-300 pt-1">
                    <span>{t('Balance Due', 'المبلغ المتبقي')}:</span>
                    <span className="font-mono text-red-700">{parseFloat(invoice.balance_due).toFixed(2)} SAR</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bank & Payment Information */}
          <div className="my-6 grid grid-cols-2 gap-6 text-xs border-t border-slate-200 pt-4">
            <div className="space-y-1">
              <p className="font-bold text-slate-800 uppercase tracking-wider mb-1">
                {t('Bank Payment Details', 'تفاصيل الحساب البنكي')}
              </p>
              {bankName && <p><span className="text-slate-500">{t('Bank Name', 'اسم البنك')}:</span> <strong>{bankName}</strong></p>}
              {accountName && <p><span className="text-slate-500">{t('Account Name', 'اسم الحساب')}:</span> <strong>{accountName}</strong></p>}
              {accountNumber && <p><span className="text-slate-500">{t('Account No', 'رقم الحساب')}:</span> <strong className="font-mono">{accountNumber}</strong></p>}
              {ibanNumber && <p><span className="text-slate-500">{t('IBAN', 'الآيبان')}:</span> <strong className="font-mono">{ibanNumber}</strong></p>}
              {swiftCode && <p><span className="text-slate-500">{t('SWIFT', 'رمز السويفت')}:</span> <strong className="font-mono">{swiftCode}</strong></p>}
            </div>

            <div className={isRtl ? 'text-left flex flex-col justify-between' : 'text-right flex flex-col justify-between'}>
              <div>
                <p className="font-bold text-slate-800 uppercase tracking-wider mb-1">
                  {t('Terms & Conditions', 'الشروط والأحكام')}
                </p>
                <p className="text-slate-600 italic">{paymentTerms}</p>
              </div>

              <div className={`pt-8 flex gap-6 items-end ${isRtl ? 'justify-start' : 'justify-end'}`}>
                {hotelStamp && (
                  <img src={hotelStamp} alt="Stamp" className="h-16 object-contain opacity-80" />
                )}
                <div className="border-t border-slate-400 w-36 text-center pt-1 text-[10px] text-slate-500 uppercase tracking-wider">
                  {t('Authorized Signature', 'التوقيع المعتمد')}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note & Print Footer */}
          <div className="print-footer border-t border-slate-200 pt-3 mt-6 flex justify-between items-center text-[10px] text-slate-500">
            <div>
              {t(
                `This is a computer-generated proforma invoice and is valid without physical signature. | ${hotelName}`,
                `هذه فاتورة شكلية صادرة عن الحاسب الآلي وصالحة بدون توقيع خطي. | ${hotelName}`
              )}
            </div>
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
