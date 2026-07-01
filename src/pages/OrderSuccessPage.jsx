import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrders } from '../api/orders';

export default function OrderSuccessPage({ user }) {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let mounted = true;
    getOrders().then((orders) => {
      if (mounted) setOrder(orders.find((x) => x.id === orderId));
    });
    return () => { mounted = false; };
  }, [orderId]);

  if (!order) return <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>;

  return (
    <div className="success-page">
      <div className="success-card">
        <div className="success-icon">🎆</div>
        <h2>Order Placed!</h2>
        <p>Your fireworks are on their way. Get ready to celebrate! 🎉</p>
        <div className="order-id-badge">{order.id}</div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
          {order.items.length} item(s) · ₹{order.total.toFixed(2)} · Delivering to {order.shippingAddress.city}
        </div>
        {order.paymentLast4 && (
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>
            Payment via card ending ••••{order.paymentLast4}
          </div>
        )}
        <div className="success-actions">
          <button className="submit-btn" style={{ maxWidth: '200px' }} onClick={() => navigate('/dashboard')}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
