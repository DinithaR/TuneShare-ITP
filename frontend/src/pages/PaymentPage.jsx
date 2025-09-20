import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const isSuccess = params.get('success') === 'true';
  const isCanceled = params.get('canceled') === 'true';

  useEffect(() => {
    // Redirect to bookings after a delay, and force refetch
    if (isSuccess) {
      const timer = setTimeout(() => navigate('/my-bookings', { state: { refetch: true } }), 4000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded shadow text-center">
        {isSuccess ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-green-600">Payment Successful!</h2>
            <p>Your payment was received and your booking is now confirmed.</p>
            <p className="mt-4 text-gray-500">Redirecting to your bookings...</p>
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
