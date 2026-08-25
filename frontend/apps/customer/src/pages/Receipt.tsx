import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

const IconPrinter = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
    </svg>
);

const IconCheckCircle = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const Receipt: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [receipt, setReceipt] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                // Fetch order details
                const order = await api.getOrder(id);
                // Fetch payment status to get provider_reference
                const paymentStatus = await api.getPaymentStatus(id);
                // Get customer phone from sessionStorage (set at checkout)
                const customerPhone = sessionStorage.getItem(`hakika_order_phone_${id}`) || 'N/A';

                // Generate a proper SHA-256 hash for the receipt
                const receiptData = {
                    order_number: order.order_number,
                    business_name: order.business_name,
                    customer_phone: customerPhone,
                    total_amount: order.total_amount,
                    payment_time: new Date(order.created_at).toISOString(),
                    items: order.items
                };
                const encoder = new TextEncoder();
                const data = encoder.encode(JSON.stringify(receiptData));
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                setReceipt({
                    receipt_number: `RCP-${order.order_number}`,
                    order_number: order.order_number,
                    business_name: order.business_name || 'N/A',
                    customer_phone: customerPhone,
                    payment_reference: paymentStatus?.provider_reference || 'N/A',
                    payment_time: order.created_at,
                    total_amount: order.total_amount,
                    items: order.items || [],
                    receipt_hash: hashHex
                });
                setLoading(false);
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="rc-page">
                <style>{styles}</style>
                <div className="rc-loading">
                    <div className="rc-spinner" />
                    <p>Loading receipt…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rc-page">
                <style>{styles}</style>
                <div className="rc-error-state">
                    <p>{error}</p>
                    <button className="rc-btn rc-btn-muted" onClick={() => navigate(-1)}>← Back</button>
                </div>
            </div>
        );
    }

    if (!receipt) {
        return (
            <div className="rc-page">
                <style>{styles}</style>
                <div className="rc-error-state">
                    <p>Receipt not found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rc-page">
            <style>{styles}</style>
            <div className="rc-container">
                <div className="rc-toolbar no-print">
                    <button className="rc-btn rc-btn-muted" onClick={() => navigate(-1)}>← Back</button>
                    <button className="rc-btn rc-btn-primary" onClick={() => window.print()}>
                        <IconPrinter /> Print / Save PDF
                    </button>
                </div>

                <div className="rc-receipt-card">
                    <div className="rc-receipt-head">
                        <div className="rc-check-icon"><IconCheckCircle /></div>
                        <h1 className="rc-title">Hakika Receipt</h1>
                        <p className="rc-receipt-no">{receipt.receipt_number}</p>
                    </div>

                    <div className="rc-meta-grid">
                        <div className="rc-meta-item">
                            <span className="rc-meta-label">Order Number</span>
                            <span className="rc-meta-value">{receipt.order_number}</span>
                        </div>
                        <div className="rc-meta-item">
                            <span className="rc-meta-label">Business</span>
                            <span className="rc-meta-value">{receipt.business_name}</span>
                        </div>
                        <div className="rc-meta-item">
                            <span className="rc-meta-label">Customer Phone</span>
                            <span className="rc-meta-value">{receipt.customer_phone}</span>
                        </div>
                        <div className="rc-meta-item">
                            <span className="rc-meta-label">Payment Reference</span>
                            <span className="rc-meta-value">{receipt.payment_reference}</span>
                        </div>
                        <div className="rc-meta-item rc-meta-full">
                            <span className="rc-meta-label">Payment Time</span>
                            <span className="rc-meta-value">{new Date(receipt.payment_time).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="rc-divider" />

                    <h3 className="rc-section-title">Items</h3>

                    {/* Table layout — shown on wider screens */}
                    <table className="rc-table">
                        <thead>
                            <tr>
                                <th className="rc-th-left">Product</th>
                                <th className="rc-th-right">Qty</th>
                                <th className="rc-th-right">Price</th>
                                <th className="rc-th-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipt.items.map((item: any) => (
                                <tr key={item.id}>
                                    <td>
                                        <div className="rc-product-cell">
                                            {item.thumbnail_url ? (
                                                <img src={item.thumbnail_url} alt={item.product_name} className="rc-thumb" />
                                            ) : (
                                                <div className="rc-thumb placeholder" />
                                            )}
                                            <span>{item.product_name}</span>
                                        </div>
                                    </td>
                                    <td className="rc-td-right">{item.quantity}</td>
                                    <td className="rc-td-right">KES {item.unit_price}</td>
                                    <td className="rc-td-right">KES {item.unit_price * item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} className="rc-total-label">Total:</td>
                                <td className="rc-total-value">KES {receipt.total_amount}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Card layout — shown on narrow screens */}
                    <div className="rc-item-cards">
                        {receipt.items.map((item: any) => (
                            <div key={item.id} className="rc-item-card">
                                {item.thumbnail_url ? (
                                    <img src={item.thumbnail_url} alt={item.product_name} className="rc-thumb" />
                                ) : (
                                    <div className="rc-thumb placeholder" />
                                )}
                                <div className="rc-item-card-info">
                                    <span className="rc-item-card-name">{item.product_name}</span>
                                    <span className="rc-item-card-qty">Qty {item.quantity} × KES {item.unit_price}</span>
                                </div>
                                <span className="rc-item-card-total">KES {item.unit_price * item.quantity}</span>
                            </div>
                        ))}
                        <div className="rc-item-cards-total">
                            <span>Total</span>
                            <span>KES {receipt.total_amount}</span>
                        </div>
                    </div>

                    <div className="rc-divider" />

                    <div className="rc-hash-block">
                        <p className="rc-hash-label">Receipt Hash (SHA-256)</p>
                        <code className="rc-hash-value">{receipt.receipt_hash}</code>
                        <p className="rc-hash-note">This hash can be used to verify the authenticity of this receipt.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = `
* { box-sizing: border-box; }

.rc-page {
    min-height: 100vh;
    background: #f7f8fa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 16px;
}

.rc-container {
    max-width: 640px;
    margin: 0 auto;
}

.rc-loading, .rc-error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    color: #6b7280;
    gap: 14px;
    text-align: center;
}

.rc-spinner {
    width: 30px;
    height: 30px;
    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: rc-spin 0.8s linear infinite;
}

@keyframes rc-spin {
    to { transform: rotate(360deg); }
}

.rc-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}

.rc-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: none;
    border-radius: 8px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}

.rc-btn-primary { background: #16a34a; color: #fff; }
.rc-btn-muted { background: #e5e7eb; color: #111827; }

.rc-receipt-card {
    background: #fff;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.rc-receipt-head {
    text-align: center;
    margin-bottom: 20px;
}

.rc-check-icon {
    width: 44px;
    height: 44px;
    margin: 0 auto 10px;
    background: #f0fdf4;
    color: #16a34a;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.rc-title {
    font-size: 22px;
    margin: 0;
    color: #111827;
}

.rc-receipt-no {
    font-size: 13px;
    color: #9ca3af;
    margin: 4px 0 0;
    font-family: monospace;
}

.rc-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 16px;
    margin-bottom: 8px;
}

@media (max-width: 420px) {
    .rc-meta-grid {
        grid-template-columns: 1fr;
    }
}

.rc-meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.rc-meta-full {
    grid-column: 1 / -1;
}

.rc-meta-label {
    font-size: 11.5px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.rc-meta-value {
    font-size: 14px;
    color: #111827;
    font-weight: 600;
    word-break: break-word;
}

.rc-divider {
    height: 1px;
    background: #e5e7eb;
    margin: 20px 0;
    border: none;
}

.rc-section-title {
    font-size: 15px;
    color: #374151;
    margin: 0 0 14px;
}

/* Table (desktop / wide screens) */
.rc-table {
    width: 100%;
    border-collapse: collapse;
    display: table;
}

.rc-th-left, .rc-th-right {
    font-size: 12px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
}

.rc-th-left { text-align: left; }
.rc-th-right { text-align: right; }

.rc-table td {
    padding: 10px 0;
    border-bottom: 1px solid #f1f5f9;
    font-size: 14px;
    color: #111827;
}

.rc-td-right { text-align: right; }

.rc-product-cell {
    display: flex;
    align-items: center;
    gap: 10px;
}

.rc-thumb {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
    flex-shrink: 0;
}

.rc-thumb.placeholder {
    background: #f3f4f6;
}

.rc-total-label {
    text-align: right;
    font-weight: 700;
    padding-top: 14px;
    border-bottom: none !important;
}

.rc-total-value {
    text-align: right;
    font-weight: 700;
    padding-top: 14px;
    border-bottom: none !important;
}

/* Card list (mobile) */
.rc-item-cards {
    display: none;
    flex-direction: column;
    gap: 10px;
}

.rc-item-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid #f1f5f9;
}

.rc-item-card-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.rc-item-card-name {
    font-size: 14px;
    color: #111827;
    font-weight: 500;
}

.rc-item-card-qty {
    font-size: 12px;
    color: #6b7280;
}

.rc-item-card-total {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    white-space: nowrap;
}

.rc-item-cards-total {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    font-size: 15px;
    color: #111827;
    padding-top: 10px;
}

@media (max-width: 520px) {
    .rc-table { display: none; }
    .rc-item-cards { display: flex; }
}

.rc-hash-block {
    background: #f9fafb;
    border-radius: 10px;
    padding: 14px;
}

.rc-hash-label {
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    margin: 0 0 6px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.rc-hash-value {
    display: block;
    font-size: 11.5px;
    color: #374151;
    word-break: break-all;
    line-height: 1.5;
    font-family: monospace;
}

.rc-hash-note {
    font-size: 11.5px;
    color: #9ca3af;
    margin: 8px 0 0;
}

/* Print styles */
@media print {
    .no-print { display: none !important; }
    .rc-page { background: #fff; padding: 0; }
    .rc-receipt-card { box-shadow: none; padding: 0; }
    .rc-table { display: table !important; }
    .rc-item-cards { display: none !important; }
}
`;

export default Receipt;