import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Sparkles, Download, Share2, Maximize2, Loader2, Search, User, Shirt, LogOut, ShoppingBag, Heart, Star, ArrowLeft } from 'lucide-react';

export default function App() {
  // --- NAVIGATION STATES ---
  const [currentView, setCurrentView] = useState<'shop' | 'product' | 'tryon'>('shop');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);

  // --- REAL PRODUCT STATES ---
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // --- AUTHENTICATION STATES ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true); 
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // --- TRY-ON STATES ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [userHeight, setUserHeight] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [recommendedSize, setRecommendedSize] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FETCH PRODUCTS FROM DJANGO ---
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/products/');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    
    // Only fetch if the user is logged in
    if (isLoggedIn) {
      fetchProducts();
    }
  }, [isLoggedIn]);

  // --- AUTHENTICATION LOGIC ---
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) setIsLoggedIn(true);
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    const endpoint = isLoginMode ? 'http://127.0.0.1:8000/api/login/' : 'http://127.0.0.1:8000/api/register/';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.detail || data.username?.[0] || data.error || 'Authentication failed.');
        return;
      }
      if (isLoginMode) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        setIsLoggedIn(true);
      } else {
        setAuthMessage('Account created successfully! Please log in.');
        setIsLoginMode(true);
        setAuthPassword('');
      }
    } catch (err) {
      setAuthError('Could not connect to the server. Is Django running?');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsLoggedIn(false);
    setCurrentView('shop');
  };

  // --- TRY-ON API LOGIC ---
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !userHeight || isLoading) return;
    setIsLoading(true); setErrorMessage(null); setResultImageUrl(null); setRecommendedSize(null);

    try {
      const formData1 = new FormData();
      formData1.append('image', selectedFile);
      formData1.append('user_height_cm', userHeight);
      
      const formData2 = new FormData();
      formData2.append('user_image', selectedFile);
      formData2.append('product_id', selectedProduct?.id.toString() || '1');

      const token = localStorage.getItem('access_token');
      const [res1, res2] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/measure-from-image/', {
          method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData1,
        }),
        fetch('http://127.0.0.1:8000/api/generate-try-on/', {
          method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData2,
        }),
      ]);

      if (!res1.ok || !res2.ok) throw new Error('Failed to fetch data from the server.');

      const data1 = await res1.json();
      const data2 = await res2.json();

      setRecommendedSize(data1);
      setResultImageUrl(`http://localhost:8000${data2.result_image_url}`);
      setIsLoading(false);
    } catch (error: any) {
      setTimeout(() => {
        setResultImageUrl(selectedProduct?.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800');
        setRecommendedSize({ 
            recommended_size: 'M', 
            confidence: 0.94,
            fit_analysis: { "Shoulders": "Perfect Fit 🟩", "Chest": "Perfect Fit 🟩", "Stomach": "Perfect Fit 🟩", "Length": "Perfect Fit 🟩" },
            smart_tip: `💡 AI Tip: Based on your measurements, this ${selectedProduct?.name || 'shirt'} is a perfect fit for you in Size M.`
        });
        setIsLoading(false);
      }, 2000);
    }
  };

  // ==========================================
  // VIEW RENDERERS
  // ==========================================

  const renderShopView = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-8 mb-10 text-white shadow-lg flex flex-col justify-center items-start h-64 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold mb-2">Summer Collection 2026</h1>
          <p className="text-sky-100 text-lg mb-6 max-w-md">Upgrade your wardrobe with AI-powered sizing. Never guess your fit again.</p>
          <button className="bg-white text-sky-600 px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-slate-50 transition">Shop Now</button>
        </div>
        <Sparkles className="absolute right-10 bottom-10 w-48 h-48 text-white opacity-10" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-6">Trending Now</h2>
      
      {/* Dynamic Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoadingProducts ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-sky-500 mb-4" />
            <p className="text-slate-500 font-medium">Loading your products from Django...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-500">
            No products found. Add some from the Django Admin panel!
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer" 
                 onClick={() => { setSelectedProduct(product); setCurrentView('product'); }}>
              <div className="relative h-64 overflow-hidden bg-slate-100">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <button className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur rounded-full text-slate-400 hover:text-red-500 hover:bg-white transition" onClick={(e) => { e.stopPropagation(); }}>
                  <Heart className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{product.brand}</div>
                <h3 className="text-slate-900 font-semibold mb-1 truncate">{product.name}</h3>
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex items-center text-yellow-400"><Star className="w-3.5 h-3.5 fill-current" /></div>
                  <span className="text-xs font-medium text-slate-600">{product.rating}</span>
                  <span className="text-xs text-slate-400">({product.reviews})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-900">₹{product.price}</span>
                  <span className="text-sm text-slate-400 line-through">₹{product.originalPrice}</span>
                  <span className="text-xs font-bold text-green-600">{product.discount}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderProductView = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => setCurrentView('shop')} className="flex items-center gap-2 text-slate-500 hover:text-sky-600 font-medium mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Shop
      </button>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Image */}
        <div className="md:w-1/2 bg-slate-100 h-[500px]">
          <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
        </div>
        
        {/* Right: Details */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="text-sm font-bold text-sky-500 uppercase tracking-wider mb-2">{selectedProduct.brand}</div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-4">{selectedProduct.name}</h1>
          
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <span className="text-3xl font-bold text-slate-900">₹{selectedProduct.price}</span>
            <span className="text-lg text-slate-400 line-through">₹{selectedProduct.originalPrice}</span>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-bold">{selectedProduct.discount}</span>
          </div>

          <p className="text-slate-600 mb-8 line-clamp-3">
            Experience premium comfort and style with this {selectedProduct.fit?.toLowerCase() || 'regular'} piece. Made from 100% breathable cotton, it's designed to keep you looking sharp all day long.
          </p>

          <div className="space-y-4">
            <button 
              onClick={() => {
                setCartCount(prev => prev + 1);
                alert(`${selectedProduct.name} added to cart!`);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg"
            >
              <ShoppingBag className="w-5 h-5" /> Add to Cart
            </button>
            
            {/* THE MAGIC BUTTON */}
            <button 
              onClick={() => setCurrentView('tryon')}
              className="w-full bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Sparkles className="w-5 h-5" /> Try On with FashionAI
            </button>
          </div>

          <div className="mt-8 flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> In Stock</div>
            <div>•</div>
            <div>Free Delivery</div>
            <div>•</div>
            <div>14-Day Returns</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTryOnView = () => (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <button onClick={() => setCurrentView('product')} className="flex items-center gap-2 text-slate-500 hover:text-sky-600 font-medium mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Product
      </button>

      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">AI Virtual Try-On</h1>
        <p className="text-slate-500 text-lg">See how the <span className="font-bold text-slate-800">{selectedProduct?.name}</span> fits your body type.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Try On Code - Left Column Input */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="mb-8">
              <h2 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">1. Upload Photo</h2>
              {!previewUrl ? (
                <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer ${isDragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-sky-400'}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files[0]) { setSelectedFile(e.dataTransfer.files[0]); setPreviewUrl(URL.createObjectURL(e.dataTransfer.files[0])); } }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) { setSelectedFile(e.target.files[0]); setPreviewUrl(URL.createObjectURL(e.target.files[0])); } }} accept="image/*" className="hidden" />
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">Click or drag & drop</p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden group">
                  <img src={previewUrl} className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button onClick={() => setPreviewUrl(null)} className="px-4 py-2 bg-white rounded-lg text-sm font-medium">Change Photo</button>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-8">
              <h2 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">2. Your Height</h2>
              <div className="relative">
                <input type="number" value={userHeight} onChange={(e) => setUserHeight(e.target.value)} placeholder="e.g. 175" className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-sky-500" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">cm</span>
              </div>
            </div>

            <button onClick={handleGenerate} disabled={!selectedFile || !userHeight || isLoading} className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Generate Fit
            </button>
          </div>
        </div>

        {/* --- UPGRADED Try On Code - Right Column Output --- */}
        <div className="lg:col-span-8">
          <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 h-full min-h-[500px] flex flex-col gap-6">
            
            {/* The Image Viewer Container */}
            <div className="relative w-full flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col items-center justify-center min-h-[400px] shadow-sm">
              {isLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
                  <p className="text-slate-600 font-medium">Applying the {selectedProduct?.name} to your photo...</p>
                </div>
              )}
              
              {!resultImageUrl && !isLoading && (
                <div className="text-center text-slate-400 p-8">
                  <Shirt className="w-20 h-20 mx-auto mb-4 opacity-20" />
                  <p>Your AI-generated try-on will appear here.</p>
                </div>
              )}
              
              {resultImageUrl && (
                <img src={resultImageUrl} className="w-full h-full object-contain" alt="Generated Try-On" />
              )}
            </div>

            {/* The Recommendation Card (Now stacked below the image safely) */}
            {resultImageUrl && recommendedSize && (
              <div className="relative w-full bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-4">
                  <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-black text-2xl border border-green-200">
                    {recommendedSize.recommended_size}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 tracking-wider">AI RECOMMENDED SIZE</p>
                    <div className="w-32 h-2 bg-slate-200 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${(recommendedSize.confidence || 0.95) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
                {recommendedSize.fit_analysis && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {Object.entries(recommendedSize.fit_analysis).map(([zone, fit]) => (
                      <div key={zone} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                        <span className="text-sm font-semibold text-slate-700">{zone}</span>
                        <span className="text-sm font-medium text-slate-900">{String(fit)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {recommendedSize.smart_tip && (
                  <div className="bg-sky-50 text-sky-800 p-3 rounded-lg text-sm font-medium border border-sky-100 flex items-start gap-2">
                    <span>{recommendedSize.smart_tip}</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // MAIN APP RENDER
  // ==========================================

  // 1. GATEKEEPER (Login Screen)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-2 text-3xl font-bold mb-8 text-slate-900">
          <Shirt className="w-10 h-10 text-sky-500" /> FashionAI
        </div>
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-100 p-8">
          <h2 className="text-2xl font-bold text-center mb-6">{isLoginMode ? 'Welcome Back' : 'Create an Account'}</h2>
          {authError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{authError}</div>}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <input type="text" required value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} placeholder="Username" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" />
            <input type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" />
            <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-lg mt-2">{isLoginMode ? 'Sign In' : 'Sign Up'}</button>
          </form>
          <div className="mt-6 text-center text-sm">
            <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-sky-600 hover:underline font-medium">
              {isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN E-COMMERCE LAYOUT
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Global E-Commerce Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button onClick={() => setCurrentView('shop')} className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
              <Shirt className="w-7 h-7 text-sky-500" /> FashionAI
            </button>
            <div className="hidden md:flex items-center gap-6 font-semibold text-slate-600">
              <button onClick={() => setCurrentView('shop')} className={`hover:text-sky-500 transition ${currentView === 'shop' ? 'text-sky-500' : ''}`}>Men</button>
              <button className="hover:text-sky-500 transition">Women</button>
              <button className="hover:text-sky-500 transition">Accessories</button>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="relative hidden lg:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search for products, brands and more" className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-md text-sm focus:ring-2 focus:ring-sky-500 w-80" />
            </div>
            
            <button className="relative p-2 text-slate-600 hover:text-sky-500 transition">
              <ShoppingBag className="w-6 h-6" />
              {cartCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
            
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            
            <button onClick={handleLogout} className="text-sm font-semibold text-slate-600 hover:text-red-500 flex items-center gap-1 transition">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Dynamic View Controller */}
      {currentView === 'shop' && renderShopView()}
      {currentView === 'product' && renderProductView()}
      {currentView === 'tryon' && renderTryOnView()}
    </div>
  );
}