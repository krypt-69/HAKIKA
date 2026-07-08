import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

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

    if (loading) return <div style={{ padding: 20 }}>Loading receipt...</div>;
    if (error) return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
    if (!receipt) return <div style={{ padding: 20 }}>Receipt not found.</div>;

    return (
        <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
            <button onClick={() => navigate(-1)} style={{ marginBottom: 10 }}>← Back</button>
            <button onClick={() => window.print()} style={{ margin: '10px 0', padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6 }}>
                🖨️ Print / Download PDF
            </button>
            <h1 style={{ textAlign: 'center' }}>Hakika Receipt</h1>
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20, marginTop: 20 }}>
                <p><strong>Receipt Number:</strong> {receipt.receipt_number}</p>
                <p><strong>Order Number:</strong> {receipt.order_number}</p>
                <p><strong>Business:</strong> {receipt.business_name}</p>
                <p><strong>Customer Phone:</strong> {receipt.customer_phone}</p>
                <p><strong>Payment Reference:</strong> {receipt.payment_reference}</p>
                <p><strong>Payment Time:</strong> {new Date(receipt.payment_time).toLocaleString()}</p>
                <hr />
                <h3>Items</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Product</th>
                            <th style={{ textAlign: 'right' }}>Qty</th>
                            <th style={{ textAlign: 'right' }}>Price</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receipt.items.map((item: any) => (
                            <tr key={item.id}>
                                <td>{item.product_name}</td>
                                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right' }}>KES {item.unit_price}</td>
                                <td style={{ textAlign: 'right' }}>KES {item.unit_price * item.quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>KES {receipt.total_amount}</td>
                        </tr>
                    </tfoot>
                </table>
                <hr />
                <p><strong>Receipt Hash (SHA‑256):</strong> <code style={{ wordBreak: 'break-all' }}>{receipt.receipt_hash}</code></p>
                <p style={{ fontSize: '0.8em', color: '#666' }}>This hash can be used to verify the authenticity of this receipt.</p>
            </div>
        </div>
    );
};

export default Receipt;
