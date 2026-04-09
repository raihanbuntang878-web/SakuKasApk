"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Home, Package, FileText, Plus, Minus, Trash2, Edit, Printer, 
  Download, Upload, X, ShoppingCart, Search, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';

export default function App() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('kasir');
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Kasir State
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [cashInput, setCashInput] = useState('');
  const [receiptData, setReceiptData] = useState(null);

  // Produk State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', stock: '' });

  // Load Data from LocalStorage on Mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedProducts = localStorage.getItem('sakukas_products');
      const savedTransactions = localStorage.getItem('sakukas_transactions');
      if (savedProducts) setProducts(JSON.parse(savedProducts));
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    }
  }, []);

  // Save Data to LocalStorage on Change
  useEffect(() => {
    localStorage.setItem('sakukas_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('sakukas_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // --- UTILITIES ---
  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // --- KASIR LOGIC ---
  const filteredProducts = products?.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const addToCart = (product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev; // Limit to available stock
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.qty + delta;
          if (newQty > item.product.stock) return item; // Cannot exceed stock
          return { ...item, qty: newQty };
        }
        return item;
      }).filter(item => item.qty > 0);
    });
  };

  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.qty), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCashInput('');
    setCheckoutModalOpen(true);
  };

  const processPayment = (e) => {
    e.preventDefault();
    const cash = parseFloat(cashInput);
    if (isNaN(cash) || cash < cartTotal) {
      alert("Nominal uang tunai kurang dari total belanja!");
      return;
    }

    const change = cash - cartTotal;
    
    // Create Transaction
    const newTransaction = {
      id: `TRX-${Math.floor(Date.now() / 1000)}`,
      timestamp: new Date().toISOString(),
      items: [...cart],
      totalPrice: cartTotal,
      cashAmount: cash,
      changeAmount: change,
      cashier: 'Admin'
    };

    // Deduct Stock
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const cartItem = cart.find(c => c.product.id === p.id);
        if (cartItem) {
          return { ...p, stock: p.stock - cartItem.qty };
        }
        return p;
      });
    });

    setTransactions(prev => [newTransaction, ...prev]);
    setCart([]);
    setCheckoutModalOpen(false);
    setReceiptData(newTransaction);
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleSmartPrint = () => {
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone/i.test(navigator.userAgent);
    if (isMobile) {
      alert("Gunakan fitur download PDF untuk print di HP");
    } else {
      handlePrint();
    }
  };

  // --- PRODUK LOGIC ---
  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({ name: product.name, price: product.price, stock: product.stock });
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', price: '', stock: '' });
    }
    setProductModalOpen(true);
  };

  const saveProduct = (e) => {
    e.preventDefault();
    const price = parseFloat(productForm.price);
    const stock = parseInt(productForm.stock, 10);

    if (!productForm.name || isNaN(price) || isNaN(stock)) {
      alert("Input tidak valid!");
      return;
    }

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, name: productForm.name, price, stock } : p));
    } else {
      setProducts(prev => [...prev, { id: generateId(), name: productForm.name, price, stock }]);
    }
    setProductModalOpen(false);
  };

  const deleteProduct = (id) => {
    if (window.confirm('Yakin ingin menghapus produk ini?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
      // Remove from cart if exists
      setCart(prev => prev.filter(c => c.product.id !== id));
    }
  };

  // --- LAPORAN LOGIC ---
  const groupedTransactions = useMemo(() => {
    const groups = {};
    transactions.forEach(trx => {
      const dateKey = new Date(trx.timestamp).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[dateKey]) {
        groups[dateKey] = { date: dateKey, total: 0, transactions: [] };
      }
      groups[dateKey].transactions.push(trx);
      groups[dateKey].total += trx.totalPrice;
    });
    // Convert object to array and sort by date descending
    return Object.values(groups).sort((a, b) => new Date(b.transactions[0].timestamp) - new Date(a.transactions[0].timestamp));
  }, [transactions]);

  const resetHistory = () => {
    if (window.confirm('PERINGATAN! Semua riwayat transaksi akan dihapus permanen. Lanjutkan?')) {
      setTransactions([]);
    }
  };

  // --- BACKUP & RESTORE LOGIC ---
  const exportData = () => {
    const data = { products, transactions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SakuKas_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.products && data.transactions) {
          if(window.confirm('Data saat ini akan ditimpa dengan data dari file backup. Lanjutkan?')) {
             setProducts(data.products);
             setTransactions(data.transactions);
             alert('Data berhasil dipulihkan!');
          }
        } else {
          alert('Format file backup tidak valid!');
        }
      } catch (err) {
        alert('Gagal membaca file backup!');
      }
    };
    reader.readAsText(file);
    e.target.value = null; // Reset input
  };

  // --- COMPONENTS ---
  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">
      {/* --- PRINT CSS INJECTION --- */}
      <style>{`
        @media print {
          body * { 
            visibility: hidden; 
          }
          
          #receipt-print-area, #receipt-print-area * { 
            visibility: visible; 
          }
          
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm; /* Ukuran Kertas Thermal */
            margin: 0;
            padding: 8px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            color: #000;
            background: white;
          }
          
          .no-print { 
            display: none !important; 
          }
        }
      `}</style>

      {/* HEADER */}
      <header className="bg-emerald-600 text-white p-4 shadow-md z-10 flex justify-between items-center no-print flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">SakuKas</h1>
          <p className="text-xs text-emerald-200">Created by: M. Raihan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportData} className="p-2 bg-emerald-700 hover:bg-emerald-800 rounded-lg transition" title="Export Backup">
            <Download size={20} />
          </button>
          <label className="p-2 bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer transition" title="Import Backup">
            <Upload size={20} />
            <input type="file" accept=".json" onChange={importData} className="hidden" />
          </label>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 no-print flex flex-col md:flex-row">
        
        {/* VIEW: KASIR */}
        {activeTab === 'kasir' && (
          <div className="flex flex-col md:flex-row w-full h-full animate-in fade-in duration-300">
            {/* Kiri: Daftar Produk */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Cari produk..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
                />
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.length === 0 ? (
                   <div className="col-span-full text-center text-gray-400 py-10">Produk tidak ditemukan atau belum ada data.</div>
                ) : filteredProducts.map(product => (
                  <div 
                    key={product.id} 
                    onClick={() => addToCart(product)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer shadow-sm flex flex-col justify-between h-36
                      ${product.stock > 0 
                        ? 'bg-white border-transparent hover:border-emerald-500 hover:shadow-md active:scale-95' 
                        : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'}`}
                  >
                    <div>
                      <h3 className="font-semibold text-gray-800 line-clamp-2">{product.name}</h3>
                      <p className="text-emerald-600 font-bold mt-1">{formatRupiah(product.price)}</p>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">Stok: {product.stock}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kanan: Keranjang */}
            <div className="w-full md:w-80 lg:w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-10">
              <div className="p-4 border-b border-gray-100 bg-emerald-50 flex items-center gap-2">
                <ShoppingCart className="text-emerald-600" />
                <h2 className="text-lg font-bold text-gray-800">Keranjang</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                    <Package size={48} className="opacity-20" />
                    <p>Keranjang kosong</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex justify-between items-center border-b pb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 text-sm">{item.product.name}</h4>
                          <p className="text-emerald-600 text-sm font-medium">{formatRupiah(item.product.price)}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                          <button onClick={() => updateCartQty(item.product.id, -1)} className="p-1 text-gray-600 hover:bg-gray-200 rounded-md transition"><Minus size={16} /></button>
                          <span className="font-bold w-6 text-center">{item.qty}</span>
                          <button 
                            onClick={() => updateCartQty(item.product.id, 1)} 
                            disabled={item.qty >= item.product.stock}
                            className={`p-1 rounded-md transition ${item.qty >= item.product.stock ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-200'}`}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between mb-4 items-end">
                  <span className="text-gray-600 font-medium">Total:</span>
                  <span className="text-2xl font-bold text-emerald-700">{formatRupiah(cartTotal)}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-bold text-lg transition-colors flex justify-center items-center gap-2"
                >
                  <CheckCircle size={20} />
                  Bayar Sekarang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: PRODUK */}
        {activeTab === 'produk' && (
          <div className="p-4 w-full max-w-5xl mx-auto animate-in fade-in duration-300">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
               <h2 className="text-2xl font-bold text-gray-800">Inventaris Produk</h2>
               <button 
                 onClick={() => openProductModal()}
                 className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
               >
                 <Plus size={20} /> Tambah Produk
               </button>
             </div>

             <div className="mb-4 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Cari produk di inventaris..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

             <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                        <th className="p-4 font-semibold">Nama Produk</th>
                        <th className="p-4 font-semibold">Harga</th>
                        <th className="p-4 font-semibold text-center">Stok</th>
                        <th className="p-4 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.length === 0 ? (
                        <tr><td colSpan="4" className="p-8 text-center text-gray-500">Belum ada produk.</td></tr>
                      ) : filteredProducts.map(product => (
                        <tr key={product.id} className="hover:bg-gray-50 transition">
                          <td className="p-4 font-medium text-gray-800">{product.name}</td>
                          <td className="p-4 text-emerald-600 font-semibold">{formatRupiah(product.price)}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            <button onClick={() => openProductModal(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit size={18} /></button>
                            <button onClick={() => deleteProduct(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}

        {/* VIEW: LAPORAN */}
        {activeTab === 'laporan' && (
          <div className="p-4 w-full max-w-5xl mx-auto animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold text-gray-800">Laporan Penjualan</h2>
               <button 
                 onClick={resetHistory}
                 disabled={transactions.length === 0}
                 className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition disabled:opacity-50"
               >
                 <RefreshCw size={18} /> Reset Riwayat
               </button>
             </div>

             {groupedTransactions.length === 0 ? (
               <div className="bg-white rounded-xl p-10 text-center border border-gray-200 shadow-sm flex flex-col items-center gap-3">
                 <FileText size={48} className="text-gray-300" />
                 <p className="text-gray-500">Belum ada riwayat transaksi.</p>
               </div>
             ) : (
               <div className="space-y-6">
                 {groupedTransactions.map((group, idx) => (
                   <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                     <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                       <h3 className="font-bold text-gray-700">{group.date}</h3>
                       <div className="bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full font-bold text-sm">
                         Total Harian: {formatRupiah(group.total)}
                       </div>
                     </div>
                     <div className="divide-y divide-gray-100 p-5 space-y-4">
                       {group.transactions.map(trx => (
                         <div key={trx.id} className="pt-4 first:pt-0">
                           <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-mono text-gray-400">{trx.id} • {new Date(trx.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
                             <span className="font-bold text-gray-800">{formatRupiah(trx.totalPrice)}</span>
                           </div>
                           <div className="pl-4 border-l-2 border-emerald-200 space-y-1">
                             {trx.items.map((item, i) => (
                               <div key={item.product.id + i} className="flex justify-between text-sm text-gray-600">
                                 <span>{item.qty}x {item.product.name}</span>
                                 <span>{formatRupiah(item.product.price * item.qty)}</span>
                               </div>
                             ))}
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

      </main>

      {/* BOTTOM NAVIGATION (Mobile & Desktop) */}
      <nav className="bg-white border-t border-gray-200 flex justify-around items-center p-2 pb-safe no-print md:hidden">
        <button onClick={() => setActiveTab('kasir')} className={`flex flex-col items-center p-2 flex-1 rounded-xl transition ${activeTab === 'kasir' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-gray-500'}`}>
          <Home size={24} />
          <span className="text-[10px] mt-1">Kasir</span>
        </button>
        <button onClick={() => setActiveTab('produk')} className={`flex flex-col items-center p-2 flex-1 rounded-xl transition ${activeTab === 'produk' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-gray-500'}`}>
          <Package size={24} />
          <span className="text-[10px] mt-1">Produk</span>
        </button>
        <button onClick={() => setActiveTab('laporan')} className={`flex flex-col items-center p-2 flex-1 rounded-xl transition ${activeTab === 'laporan' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-gray-500'}`}>
          <FileText size={24} />
          <span className="text-[10px] mt-1">Laporan</span>
        </button>
      </nav>

      {/* SIDEBAR NAVIGATION (Desktop Only) - optional enhancement for larger screens, but we stick to bottom nav per requirements, we just make it side-nav on md if wanted. Let's keep it bottom for true mobile-first but hidden on desktop if we wanted. Actually, let's keep it visible on desktop as a bottom bar or side bar. For simplicity, we keep it as a bottom bar or side nav. Let's make it a bottom bar on mobile, side bar on desktop. */}
      <nav className="hidden md:flex flex-col w-20 lg:w-64 bg-white border-r border-gray-200 h-full fixed top-16 left-0 no-print z-20">
        <div className="flex flex-col gap-2 p-4">
          <button onClick={() => setActiveTab('kasir')} className={`flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'kasir' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Home size={24} />
            <span className="hidden lg:block">Kasir POS</span>
          </button>
          <button onClick={() => setActiveTab('produk')} className={`flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'produk' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Package size={24} />
            <span className="hidden lg:block">Inventaris Produk</span>
          </button>
          <button onClick={() => setActiveTab('laporan')} className={`flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'laporan' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-gray-500 hover:bg-gray-50'}`}>
            <FileText size={24} />
            <span className="hidden lg:block">Laporan Keuangan</span>
          </button>
        </div>
        <div className="mt-auto p-4 border-t text-center hidden lg:block">
           <p className="text-xs text-gray-400">© 2026 SakuKas</p>
           <p className="text-xs text-gray-400 font-semibold mt-1">Created by: M. Raihan</p>
        </div>
      </nav>
      {/* Adjust main content margin for desktop sidebar */}
      <style>{`@media (min-width: 768px) { main { margin-left: 5rem; } } @media (min-width: 1024px) { main { margin-left: 16rem; } }`}</style>

      {/* --- MODALS --- */}

      {/* 1. Modal Checkout */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in no-print">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-emerald-600 text-white">
              <h3 className="font-bold text-xl">Pembayaran</h3>
              <button onClick={() => setCheckoutModalOpen(false)} className="text-emerald-100 hover:text-white transition"><X size={24} /></button>
            </div>
            <form onSubmit={processPayment} className="p-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex justify-between items-center">
                <span className="text-gray-600 font-medium">Total Tagihan:</span>
                <span className="text-2xl font-bold text-emerald-600">{formatRupiah(cartTotal)}</span>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Uang Tunai (Pembeli)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 font-bold text-gray-500">Rp</span>
                  <input 
                    type="number" 
                    required
                    min={cartTotal}
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-bold"
                    placeholder="0"
                    autoFocus
                  />
                </div>
                {cashInput && parseFloat(cashInput) < cartTotal && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1"><AlertCircle size={14}/> Uang kurang dari total tagihan.</p>
                )}
                {cashInput && parseFloat(cashInput) >= cartTotal && (
                   <p className="text-emerald-600 text-sm mt-2 font-medium">Kembalian: {formatRupiah(parseFloat(cashInput) - cartTotal)}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setCheckoutModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold border border-gray-300 text-gray-600 hover:bg-gray-50 transition">Batal</button>
                <button type="submit" disabled={!cashInput || parseFloat(cashInput) < cartTotal} className="flex-1 py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 transition">Proses Bayar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Add/Edit Product */}
      {productModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in no-print">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-emerald-600 text-white">
              <h3 className="font-bold text-xl">{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
              <button onClick={() => setProductModalOpen(false)} className="text-emerald-100 hover:text-white transition"><X size={24} /></button>
            </div>
            <form onSubmit={saveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Produk</label>
                <input 
                  type="text" 
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Contoh: Kopi Susu"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Jual (Rp)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Stok Awal</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setProductModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold border border-gray-300 text-gray-600 hover:bg-gray-50 transition">Batal</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Struk (Printable) */}
      {receiptData && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          
          {/* Action Buttons (No Print) */}
          <div className="mb-4 flex gap-4 no-print">
             <button onClick={() => setReceiptData(null)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-bold hover:bg-gray-300 transition shadow-lg">Tutup</button>
             <button onClick={handleSmartPrint} className="bg-emerald-500 text-white px-6 py-2 rounded-full font-bold hover:bg-emerald-600 transition shadow-lg flex items-center gap-2">
               <Printer size={18} /> Cetak Struk
             </button>
          </div>

          {/* AREA CETAK STRUK (Target for @media print) */}
          <div id="receipt-print-area" className="bg-white p-4 w-full max-w-[58mm] min-h-[50mm] rounded-sm shadow-2xl relative">
            
            {/* Header */}
            <div className="text-center mb-4 border-b border-black pb-2 border-dashed">
              <h2 className="font-bold text-[14px] uppercase mb-1">SakuKas</h2>
              <p className="text-[10px] leading-tight mb-1">Toko UMKM Modern</p>
              <div className="text-[10px] flex justify-between mt-2">
                 <span>Kasir: {receiptData.cashier}</span>
              </div>
              <div className="text-[10px] flex justify-between">
                 <span>Tgl: {formatDate(receiptData.timestamp)}</span>
              </div>
              <div className="text-[10px] text-left mt-1">ID: {receiptData.id}</div>
            </div>

            {/* Body: Items */}
            <div className="mb-3 text-[11px]">
              {receiptData.items.map((item, i) => (
                <div key={item.product.id + i} className="mb-2 flex flex-col">
                  <div className="font-bold">{item.product.name}</div>
                  <div className="flex justify-between w-full pl-2">
                    <span>{item.qty} x {item.product.price.toLocaleString('id-ID')}</span>
                    <span>{(item.qty * item.product.price).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer: Totals */}
            <div className="border-t border-black pt-2 border-dashed text-[11px]">
               <div className="flex justify-between font-bold text-[12px] mb-1">
                 <span>TOTAL</span>
                 <span>Rp {receiptData.totalPrice.toLocaleString('id-ID')}</span>
               </div>
               <div className="flex justify-between">
                 <span>Tunai</span>
                 <span>Rp {receiptData.cashAmount.toLocaleString('id-ID')}</span>
               </div>
               <div className="flex justify-between">
                 <span>Kembali</span>
                 <span>Rp {receiptData.changeAmount.toLocaleString('id-ID')}</span>
               </div>
            </div>

            {/* Greetings & Credit */}
            <div className="text-center mt-6 text-[10px] leading-tight">
               <p className="font-bold">Terima Kasih!</p>
               <p className="mb-2">Selamat Belanja Kembali</p>
               <p className="text-[8px] text-gray-500 mt-4 border-t border-gray-300 pt-1">Created by: M. Raihan</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
