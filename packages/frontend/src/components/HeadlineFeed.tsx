// packages/frontend/src/components/HeadlineFeed.tsx (Updated)
import React, { useEffect, useState } from 'react';
import { fetchHeadlines } from '../utils/api';
import { io, Socket } from 'socket.io-client';
import { signInWithEthereum } from '../utils/siwe';

const SOCKET_URL = 'http://localhost:4001';

interface Headline {
  id: string;
  text: string;
  eventType: string;
  blockNumber?: number;
  timestamp: Date;
  bidderInfo?: string | null;
  ethPrice?: string;
  usdPrice?: number;
  isNew: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  address: string | null;
  loading: boolean;
}

// Simple icon components using CSS and Unicode
const Icon = {
  Activity: ({ className }: { className?: string }) => (
    <div className={`${className} flex items-center justify-center`}>
      <div className="w-full h-full rounded-full bg-current opacity-80 flex items-center justify-center text-xs font-bold">
        📊
      </div>
    </div>
  ),
  
  Clock: ({ className }: { className?: string }) => (
    <div className={`${className} flex items-center justify-center`}>
      <div className="w-full h-full rounded-full bg-current opacity-80 flex items-center justify-center text-xs">
        ⏰
      </div>
    </div>
  ),
  
  DollarSign: ({ className }: { className?: string }) => (
    <div className={`${className} flex items-center justify-center`}>
      <div className="w-full h-full rounded-full bg-current opacity-80 flex items-center justify-center text-xs">
        💰
      </div>
    </div>
  ),
  
  Eye: ({ className }: { className?: string }) => (
    <div className={`${className} flex items-center justify-center`}>
      <div className="w-full h-full rounded-full bg-current opacity-80 flex items-center justify-center text-xs">
        👁️
      </div>
    </div>
  ),
  
  Zap: ({ className }: { className?: string }) => (
    <div className={`${className} flex items-center justify-center`}>
      <div className="w-full h-full rounded-full bg-current opacity-80 flex items-center justify-center text-xs">
        ⚡
      </div>
    </div>
  ),

  Shield: ({ className }: { className?: string }) => (
    <div className={`${className} flex items-center justify-center`}>
      <div className="w-full h-full rounded-full bg-current opacity-80 flex items-center justify-center text-xs">
        🛡️
      </div>
    </div>
  )
};

export default function HeadlineFeed() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [newHeadlineCount, setNewHeadlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    address: null,
    loading: true
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check authentication status on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/me', { 
          credentials: 'include' 
        });
        
        if (response.ok) {
          const { user } = await response.json();
          setAuthState({
            isAuthenticated: true,
            address: user.address,
            loading: false
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            address: null,
            loading: false
          });
        }
      } catch (err) {
        console.error("❌ Auth check failed:", err);
        setAuthState({
          isAuthenticated: false,
          address: null,
          loading: false
        });
      }
    };

    checkAuth();
  }, []);

  // Fetch from REST API
  useEffect(() => {
    const loadHeadlines = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetchHeadlines();
        console.log("🔍 Full API Response:", response);
        
        // Handle the response structure: { data: [...], page: 1, total: 7, hasNextPage: false }
        const apiData = response.data || response; // Handle both response formats
        
        if (!Array.isArray(apiData)) {
          console.error("❌ Expected array but got:", typeof apiData, apiData);
          setError("Invalid data format received from API");
          return;
        }

        const formatted = apiData.map((h: any, index: number) => {
          console.log(`🔧 Processing headline ${index}:`, h);
          
          return {
            id: h.id ? `${h.id}-${h.blockNumber || Date.now()}` : `headline-${index}-${Date.now()}`,
            text: h.headline || (h.nounId 
              ? `Noun #${h.nounId} ${h.eventType} (Block ${h.blockNumber || 'Unknown'})`
              : `${h.eventType || 'Unknown Event'} (Block ${h.blockNumber || 'Unknown'})`),
            eventType: h.eventType || 'AuctionCreated',
            blockNumber: h.blockNumber,
            timestamp: h.timestamp ? new Date(h.timestamp) : new Date(h.createdAt || Date.now()),
            bidderInfo: h.bidderEns || h.bidderAddress || null,
            ethPrice: h.ethPrice,
            usdPrice: h.usdPrice,
            isNew: false
          };
        });

        console.log("✅ Formatted headlines:", formatted);
        setHeadlines(formatted);
        
      } catch (err) {
        console.error("❌ Error fetching headlines:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch headlines");
      } finally {
        setLoading(false);
      }
    };

    loadHeadlines();
  }, []);

  // WebSocket connection - only if authenticated
  useEffect(() => {
    if (!authState.isAuthenticated) {
      console.log("🔒 Not authenticated - skipping WebSocket connection");
      return;
    }

    console.log("🔌 Attempting authenticated WebSocket connection...");
    
    const newSocket = io(SOCKET_URL, {
      withCredentials: true, // Important: send cookies with connection
      transports: ['websocket', 'polling']
    });
    
    newSocket.on('connect', () => {
      console.log("🟢 Authenticated WebSocket connected");
      setIsConnected(true);
      setAuthError(null);
    });

    newSocket.on('disconnect', () => {
      console.log("🔴 WebSocket disconnected");
      setIsConnected(false);
    });

    newSocket.on('auth_required', (data) => {
      console.log("❌ WebSocket auth required:", data);
      setAuthError("Authentication required for real-time feed");
      setIsConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log("✅ WebSocket authenticated:", data);
      setAuthError(null);
    });

    newSocket.on('headline', (payload: string) => {
      console.log("🟢 Received via WebSocket:", payload);
      
      // Extract event type from payload if possible
      const eventTypeMatch = payload.match(/(AuctionCreated|AuctionBid|AuctionSettled)/);
      const eventType = eventTypeMatch ? eventTypeMatch[1] : 'AuctionCreated';
      
      const newHeadline: Headline = {
        id: `ws-${Date.now()}-${Math.random()}`,
        text: payload,
        eventType,
        timestamp: new Date(),
        isNew: true
      };
      
      setHeadlines((prev) => [newHeadline, ...prev.slice(0, 49)]);
      setNewHeadlineCount(prev => prev + 1);
      
      // Remove "new" status after 5 seconds
      setTimeout(() => {
        setHeadlines(prev => prev.map(h => 
          h.id === newHeadline.id ? { ...h, isNew: false } : h
        ));
      }, 5000);
    });

    newSocket.on('connect_error', (error) => {
      console.error("❌ WebSocket connection error:", error);
      setAuthError("Failed to connect to real-time feed");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [authState.isAuthenticated]);

  const handleSiweLogin = async () => {
    try {
      console.log("🔐 Starting SIWE login...");
      const res = await signInWithEthereum();
      console.log("✅ SIWE login successful:", res);
      
      setAuthState({
        isAuthenticated: true,
        address: res.address,
        loading: false
      });
      
      setAuthError(null);
    } catch (err) {
      console.error("❌ SIWE login error:", err);
      setAuthError(err instanceof Error ? err.message : "Sign-in failed");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
      
      setAuthState({
        isAuthenticated: false,
        address: null,
        loading: false
      });
      
      if (socket) {
        socket.disconnect();
      }
      
      setIsConnected(false);
    } catch (err) {
      console.error("❌ Logout error:", err);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'AuctionCreated':
        return <Icon.Zap className="w-5 h-5 text-green-500" />;
      case 'AuctionBid':
        return <Icon.DollarSign className="w-5 h-5 text-yellow-500" />;
      case 'AuctionSettled':
        return <Icon.Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Icon.Activity className="w-5 h-5 text-purple-500" />;
    }
  };

  const formatBlockchainTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'AuctionCreated':
        return 'bg-green-200 text-green-900';
      case 'AuctionBid':
        return 'bg-yellow-200 text-yellow-900';
      case 'AuctionSettled':
        return 'bg-blue-200 text-blue-900';
      default:
        return 'bg-purple-300 text-purple-800 border-purple-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">⌐◨-◨</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Nouns Auction Tracker
                </h1>
                <p className="text-gray-600 mt-1">Real-time auction monitoring for the Nounish ecosystem</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Authentication Status */}
              {authState.isAuthenticated ? (
                <div className="flex items-center space-x-2 bg-green-100 rounded-full px-4 py-2">
                  <Icon.Shield className="w-4 h-4 text-green-600" />
                  <span className="text-green-800 text-sm font-medium">
                    {authState.address?.slice(0, 6)}...{authState.address?.slice(-4)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-red-100 rounded-full px-4 py-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-red-800 text-sm font-medium">Not Authenticated</span>
                </div>
              )}

              {/* Connection Status */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 
                  authState.isAuthenticated ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-gray-700 text-sm font-medium">
                  {isConnected ? 'Live Feed' : 
                   authState.isAuthenticated ? 'Connecting...' : 'Auth Required'}
                </span>
              </div>
              
              {newHeadlineCount > 0 && (
                <div className="bg-indigo-600 text-white rounded-full px-4 py-2 text-sm font-semibold">
                  +{newHeadlineCount} new
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auth Error Banner */}
      {authError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">
                🔒 {authError} - Please sign in with your Ethereum wallet to access the real-time feed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Headlines Feed */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Icon.Activity className="w-5 h-5 text-gray-600 mr-2" />
                    Live Auction Headlines
                    {authState.isAuthenticated && isConnected && (
                      <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        🔒 Protected Feed
                      </span>
                    )}
                  </h2>
                  <span className="text-sm text-gray-500">{headlines.length} events</span>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading auction events...</h3>
                    <p className="text-gray-500">Fetching latest data from the blockchain</p>
                  </div>
                ) : error ? (
                  <div className="p-12 text-center">
                    <div className="text-red-500 text-4xl mb-4">⚠️</div>
                    <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Events</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Retry
                    </button>
                  </div>
                ) : headlines.length === 0 ? (
                  <div className="p-12 text-center">
                    <Icon.Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No auction events found</h3>
                    <p className="text-gray-500">Check your database or wait for new events to occur</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {headlines.map((headline) => (
                      <div
                        key={headline.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          headline.isNew ? 'bg-green-50 border-l-4 border-green-400' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getEventIcon(headline.eventType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 mb-2">
                              {headline.text}
                            </p>
                            <div className="flex items-center space-x-4 flex-wrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEventTypeColor(headline.eventType)}`}>
                                {headline.eventType}
                              </span>
                              
                              {headline.bidderInfo && (
                                <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">
                                  {headline.bidderInfo.endsWith('.eth') 
                                    ? headline.bidderInfo 
                                    : `${headline.bidderInfo.slice(0, 6)}...${headline.bidderInfo.slice(-4)}`
                                  }
                                </span>
                              )}
                              
                              {headline.blockNumber && (
                                <span className="text-xs text-gray-500">
                                  Block #{headline.blockNumber.toLocaleString()}
                                </span>
                              )}
                              
                              <span className="text-xs text-purple-600 font-mono bg-purple-50 px-2 py-1 rounded">
                                {formatBlockchainTimestamp(headline.timestamp)}
                              </span>
                              
                              {headline.isNew && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  NEW
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Auctions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {headlines.filter(h => h.eventType === 'AuctionCreated').length}
                  </p>
                </div>
                <Icon.Zap className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bids</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {headlines.filter(h => h.eventType === 'AuctionBid').length}
                  </p>
                </div>
                <Icon.DollarSign className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Settled Auctions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {headlines.filter(h => h.eventType === 'AuctionSettled').length}
                  </p>
                </div>
                <Icon.Clock className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Auth Status</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {authState.isAuthenticated ? 'Signed In' : 'Not Signed In'}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-full ${authState.isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
            </div>

            {/* Auth Button */}
            {authState.isAuthenticated ? (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium">✅ Authenticated</p>
                  <p className="text-xs text-green-600 mt-1">
                    {authState.address?.slice(0, 10)}...{authState.address?.slice(-6)}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleSiweLogin}
                disabled={authState.loading}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-black rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {authState.loading ? 'Loading...' : '🔒 Sign in with Ethereum'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}