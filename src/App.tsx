import React, { useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { StoreFront } from './components/StoreFront';
import { AccountView } from './components/AccountView';
import { AdminPanel } from './components/AdminPanel';
import { AboutSellerPage } from './components/AboutSellerPage';
import { ReturnsExchangePage } from './components/ReturnsExchangePage';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { StockAlertModal } from './components/StockAlertModal';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { ConsultationWidget } from './components/ConsultationWidget';
import { ErrorBoundary } from './components/ErrorBoundary';

const AppContent: React.FC = () => {
  const { activeView } = useStore();

  useEffect(() => {
    // Immediately scroll to the very top whenever the active view changes
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeView]);

  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-clip relative bg-slate-50 text-slate-800">
      <Toast />

      {/* Primary Header */}
      <Header />

      {/* Main Viewport Router */}
      <div className="flex-1 relative z-10">
        {activeView === 'store' && <StoreFront />}
        {activeView === 'account' && <AccountView />}
        {activeView === 'admin' && <AdminPanel />}
        {activeView === 'about' && <AboutSellerPage />}
        {activeView === 'returns' && <ReturnsExchangePage />}
      </div>

      {/* Floating Pulsating Consultation Widget */}
      {activeView !== 'admin' && <ConsultationWidget />}

      {/* Modals & Slide-overs */}
      <ProductDetailModal />
      <StockAlertModal />
      <CartDrawer />
      <CheckoutModal />

      {/* Site Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ErrorBoundary>
  );
}
