import React, { useState } from 'react';
import { SystemProvider, useSystem } from './context/SystemContext.jsx';
import { AudioProvider } from './context/AudioContext.jsx';

// Common Components
import Sidebar from './components/common/Sidebar.jsx';
import TopHeader from './components/common/TopHeader.jsx';
import DemoScenariosBar from './components/common/DemoScenariosBar.jsx';
import BinDetailsDrawer from './components/map/BinDetailsDrawer.jsx';

// Mobile View
import MobileWorkerApp from './components/mobile/MobileWorkerApp.jsx';

// Modals
import CreateOrderModal from './components/modals/CreateOrderModal.jsx';
import SplitPutAwayModal from './components/modals/SplitPutAwayModal.jsx';
import ReportDiscrepancyModal from './components/modals/ReportDiscrepancyModal.jsx';
import StockTransferModal from './components/modals/StockTransferModal.jsx';
import ProcessReturnModal from './components/modals/ProcessReturnModal.jsx';

// Pages
import DashboardPage from './pages/DashboardPage.jsx';
import MapPage from './pages/MapPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import PickingPage from './pages/PickingPage.jsx';
import MovementsPage from './pages/MovementsPage.jsx';
import OperationsPage from './pages/OperationsPage.jsx';
import ReturnsPage from './pages/ReturnsPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';

function MainApp() {
  const {
    activePage,
    setActivePage,
    viewMode,
    setViewMode,
    liveToast,
    inspectBin
  } = useSystem();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modal Open States
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [splitPutawayOpen, setSplitPutawayOpen] = useState(false);
  const [discrepancyOpen, setDiscrepancyOpen] = useState(false);
  const [discrepancyInitialLoc, setDiscrepancyInitialLoc] = useState('WH1-R03-B04');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferInitialLoc, setTransferInitialLoc] = useState('WH1-R01-B02');
  const [processReturnOpen, setProcessReturnOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Search/filter drill-down state
  const [inventorySearchSku, setInventorySearchSku] = useState('');
  const [movementsFilterSku, setMovementsFilterSku] = useState('');

  // Handle Demo triggers
  const handleDemoCase = (action) => {
    if (action.type === 'SEARCH_SKU') {
      setInventorySearchSku(action.sku);
    } else if (action.type === 'FILTER_MOVEMENTS') {
      setMovementsFilterSku(action.sku);
    } else if (action.type === 'OPEN_SPLIT_PUTAWAY') {
      setSplitPutawayOpen(true);
    }
  };

  // If in Mobile Handheld Worker mode
  if (viewMode === 'mobile') {
    return <MobileWorkerApp onBackToDesktop={() => setViewMode('desktop')} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07090e] text-slate-200">
      {/* Sidebar Navigation */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Command Bar */}
        <TopHeader onOpenOrderModal={() => setCreateOrderOpen(true)} />

        {/* Hackathon 10 Demo Scenarios Bar for Judges */}
        <DemoScenariosBar onTriggerCase={handleDemoCase} />

        {/* Dynamic Page View Router */}
        <main className="flex-1 overflow-y-auto p-5">
          {activePage === 'dashboard' && (
            <DashboardPage
              onOpenCreateOrder={() => setCreateOrderOpen(true)}
              onOpenTransfer={() => {
                setTransferInitialLoc('WH1-R01-B02');
                setTransferOpen(true);
              }}
              onOpenPutaway={() => setSplitPutawayOpen(true)}
              onOpenDiscrepancy={() => {
                setDiscrepancyInitialLoc('WH1-R03-B04');
                setDiscrepancyOpen(true);
              }}
            />
          )}

          {activePage === 'map' && <MapPage />}

          {activePage === 'inventory' && (
            <InventoryPage initialSearchSku={inventorySearchSku} />
          )}

          {activePage === 'orders' && (
            <OrdersPage onOpenCreateOrder={() => setCreateOrderOpen(true)} />
          )}

          {activePage === 'picking' && <PickingPage />}

          {activePage === 'operations' && (
            <OperationsPage
              onOpenSplitPutaway={() => setSplitPutawayOpen(true)}
              onOpenTransfer={() => {
                setTransferInitialLoc('WH1-R01-B02');
                setTransferOpen(true);
              }}
              onOpenDiscrepancy={() => {
                setDiscrepancyInitialLoc('WH1-R03-B04');
                setDiscrepancyOpen(true);
              }}
            />
          )}

          {activePage === 'movements' && (
            <MovementsPage initialFilterSku={movementsFilterSku} />
          )}

          {activePage === 'returns' && (
            <ReturnsPage
              onOpenProcessReturn={(ret) => {
                setSelectedReturn(ret);
                setProcessReturnOpen(true);
              }}
            />
          )}

          {activePage === 'alerts' && <AlertsPage />}
        </main>
      </div>

      {/* Slide-out Bin Inspection Drawer */}
      <BinDetailsDrawer
        onOpenTransfer={(loc) => {
          setTransferInitialLoc(loc);
          setTransferOpen(true);
        }}
        onOpenDiscrepancy={(loc) => {
          setDiscrepancyInitialLoc(loc);
          setDiscrepancyOpen(true);
        }}
        onOpenPutaway={() => setSplitPutawayOpen(true)}
      />

      {/* Global Modals */}
      <CreateOrderModal
        isOpen={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
      />

      <SplitPutAwayModal
        isOpen={splitPutawayOpen}
        onClose={() => setSplitPutawayOpen(false)}
      />

      <ReportDiscrepancyModal
        isOpen={discrepancyOpen}
        initialLocation={discrepancyInitialLoc}
        onClose={() => setDiscrepancyOpen(false)}
      />

      <StockTransferModal
        isOpen={transferOpen}
        initialFromLocation={transferInitialLoc}
        onClose={() => setTransferOpen(false)}
      />

      <ProcessReturnModal
        isOpen={processReturnOpen}
        initialReturn={selectedReturn}
        onClose={() => setProcessReturnOpen(false)}
      />

      {/* Global Realtime Event Toast */}
      {liveToast && (
        <div className="fixed bottom-5 right-5 z-50 animate-slideUp">
          <div
            className={`p-3 rounded-lg border shadow-2xl flex items-center gap-2.5 font-mono text-xs ${
              liveToast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200 shadow-emerald-500/20'
                : liveToast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/60 text-rose-200 shadow-rose-500/20'
                : 'bg-cyan-950/90 border-cyan-500/60 text-cyan-200 shadow-cyan-500/20'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="beacon-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="font-semibold">{liveToast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AudioProvider>
      <SystemProvider>
        <MainApp />
      </SystemProvider>
    </AudioProvider>
  );
}
