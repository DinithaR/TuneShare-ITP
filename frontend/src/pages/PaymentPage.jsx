import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const isSuccess = params.get('success') === 'true';
  const isCanceled = params.get('canceled') === 'true';
  const bookingId = params.get('bookingId');
  const { axios } = useAppContext();
  const [status, setStatus] = useState({ loading: false, paid: false, confirmed: false });
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef(null);

  // Poll a single booking to see when webhook updates paymentStatus
  useEffect(() => {
    if (!isSuccess || !bookingId) return;
    let attempts = 0;
    setStatus(s => ({ ...s, loading: true }));
    pollRef.current = setInterval(async () => {
      attempts += 1;
      setElapsed(e => e + 2);
      try {
        const { data } = await axios.get(`/api/bookings/one/${bookingId}`);
        if (data.success && data.booking) {
          const b = data.booking;
          const paid = b.paymentStatus === 'paid';
          const confirmed = b.status === 'confirmed';
          setStatus({ loading: !paid, paid, confirmed });
          if (paid || attempts >= 10) { // stop after success or ~20s
            clearInterval(pollRef.current);
            pollRef.current = null;
            // Redirect a bit sooner once paid detected
            setTimeout(() => navigate('/my-bookings', { state: { refetch: true } }), 1500);
          }
        }
      } catch (e) {
        // ignore transient errors
      }
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isSuccess, bookingId, axios, navigate]);

  // Fallback redirect if webhook never updates (prevent user stuck)
  useEffect(() => {
    if (isSuccess) {
      const fallback = setTimeout(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        navigate('/my-bookings', { state: { refetch: true } });
      }, 25000); // 25s fallback
      return () => clearTimeout(fallback);
    }
  }, [isSuccess, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded shadow text-center">
        {isSuccess ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-green-600">Payment Successful</h2>
            {!status.paid ? (
              <p>Waiting for payment confirmation (webhook)…</p>
            ) : status.confirmed ? (
              <p>Your booking is confirmed.</p>
            ) : (
              <p>Payment recorded. Booking is awaiting owner approval.</p>
            )}
            <div className="mt-4 text-sm text-gray-500">
              {!status.paid && <p>Polling for update… {elapsed}s</p>}
              {status.paid && !status.confirmed && <p>Owner will review shortly.</p>}
              <p>You will be redirected automatically.</p>
            </div>
          </>
        ) : isCanceled ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-red-600">Payment Canceled</h2>
            <p>Your payment was not completed. You can try again from your bookings page.</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4">Redirecting to payment...</h2>
            <p>If you are not redirected, please click the Pay Now button from your bookings page again.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;
