import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

const SystemContext = createContext(null);

export const ROLES = [
  { id: 'admin', name: 'Admin', badge: 'FULL ACCESS' },
  { id: 'manager', name: 'Warehouse Manager', badge: 'OPERATIONS LEAD' },
  { id: 'picker', name: 'Picker', badge: 'HANDHELD ASSISTANT' },
  { id: 'operator', name: 'Stock Operator', badge: 'INBOUND & PUT-AWAY' },
  { id: 'auditor', name: 'Auditor', badge: 'READ-ONLY AUDIT' }
];

export function SystemProvider({ children }) {
  // Navigation & Role
  const [activePage, setActivePage] = useState('dashboard');
  const [currentRole, setCurrentRole] = useState(ROLES[0]);
  const [viewMode, setViewMode] = useState('desktop'); // 'desktop' | 'mobile'

  // Global Data
  const [analytics, setAnalytics] = useState(null);
  const [locationsData, setLocationsData] = useState(null);
  const [selectedBin, setSelectedBin] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);

  // System & Realtime status
  const [systemOnline, setSystemOnline] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [liveToast, setLiveToast] = useState(null);

  // Global search modal/popover
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [demoCases, setDemoCases] = useState([]);

  // Fetch Dashboard Analytics
  const refreshAnalytics = useCallback(async () => {
    try {
      const res = await api.getDashboardAnalytics();
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (e) {
      console.error('Analytics load failure:', e);
    }
  }, []);

  // Fetch Locations & Map Bins
  const refreshLocations = useCallback(async () => {
    try {
      const res = await api.getLocations();
      if (res.success) {
        setLocationsData(res.data);
      }
    } catch (e) {
      console.error('Locations load failure:', e);
    }
  }, []);

  // Fetch Demo Cases
  const refreshDemoCases = useCallback(async () => {
    try {
      const res = await api.getDemoCases();
      if (res.success) {
        setDemoCases(res.data);
      }
    } catch (e) {}
  }, []);

  // Show temporary toast notification
  const showToast = useCallback((msg, type = 'info') => {
    setLiveToast({ msg, type, id: Date.now() });
    setTimeout(() => {
      setLiveToast(prev => (prev?.id === Date.now() ? null : prev));
    }, 4500);
  }, []);

  // Open bin detail drawer
  const inspectBin = useCallback(async (locationCode) => {
    try {
      const res = await api.getBinDetails(locationCode);
      if (res.success) {
        setSelectedBin(res.data);
        setDrawerOpen(true);
      }
    } catch (e) {
      showToast(`Error inspecting location ${locationCode}`, 'error');
    }
  }, [showToast]);

  // Connect to Real-time SSE Stream
  useEffect(() => {
    refreshAnalytics();
    refreshLocations();
    refreshDemoCases();

    let eventSource = null;

    try {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setRealtimeConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'CONNECTED') {
            setRealtimeConnected(true);
          } else if (data.type === 'PICK_COMPLETED') {
            showToast(`✓ Picked: ${data.unitsRemoved} × ${data.sku} from ${data.locationCode}`, 'success');
            refreshAnalytics();
            refreshLocations();
          } else if (data.type === 'ORDER_CREATED') {
            showToast(`🛒 ${data.orderNumber} Allocated`, 'info');
            refreshAnalytics();
            refreshLocations();
          } else if (data.type === 'PUTAWAY_SPLIT') {
            showToast(`📥 Split Put-Away: ${data.totalUnits} units of ${data.sku} stored`, 'success');
            refreshAnalytics();
            refreshLocations();
          } else if (data.type === 'DISCREPANCY_REPORTED') {
            showToast(`⚠ Phantom discrepancy reported at ${data.locationCode}`, 'error');
            refreshAnalytics();
            refreshLocations();
          } else if (data.type === 'TRANSFER_COMPLETED') {
            showToast(`⇄ Transferred ${data.quantity} × ${data.sku} to ${data.toLocation}`, 'info');
            refreshAnalytics();
            refreshLocations();
          } else if (data.type === 'DEMO_RESET') {
            showToast('🔄 Demo Dataset Reset', 'info');
            refreshAnalytics();
            refreshLocations();
          }
        } catch (err) {
          console.error('SSE JSON parse error:', err);
        }
      };

      eventSource.onerror = () => {
        setRealtimeConnected(false);
      };
    } catch (err) {
      console.error('SSE initialization error:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [refreshAnalytics, refreshLocations, refreshDemoCases, showToast]);

  return (
    <SystemContext.Provider
      value={{
        activePage,
        setActivePage,
        currentRole,
        setCurrentRole,
        roles: ROLES,
        viewMode,
        setViewMode,
        analytics,
        refreshAnalytics,
        locationsData,
        refreshLocations,
        selectedBin,
        setSelectedBin,
        drawerOpen,
        setDrawerOpen,
        inspectBin,
        activeRoute,
        setActiveRoute,
        systemOnline,
        realtimeConnected,
        liveToast,
        showToast,
        globalSearchOpen,
        setGlobalSearchOpen,
        demoCases,
        refreshDemoCases
      }}
    >
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  return useContext(SystemContext);
}
