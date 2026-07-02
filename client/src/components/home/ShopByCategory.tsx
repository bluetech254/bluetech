import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../../api/products';

export const ShopByCategory = () => {
  const [categoryProducts, setCategoryProducts] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getProducts({ limit: 100 });
        const products = response.products || [];
        
        // Group products by category
        const grouped: { [key: string]: any } = {};
        products.forEach((p: any) => {
          try {
            const specs = typeof p.specifications === 'string' 
              ? JSON.parse(p.specifications) 
              : p.specifications;
            const cat = specs?.category;
            if (cat && !grouped[cat]) {
              grouped[cat] = p;
            }
          } catch {}
        });

        setCategoryProducts(grouped);
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || Object.keys(categoryProducts).length === 0) {
    return null;
  }

  const categories = Object.keys(categoryProducts);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Shop Our Product Categories
        </h2>
      </div>

      {/* Auto-scrolling horizontal container */}
      <div className="overflow-hidden">
        <div className={`flex gap-6 ${hoveredIdx === null ? 'animate-scroll' : ''}`}>
          {categories.map((cat, idx) => {
            const product = categoryProducts[cat];
            const image = product?.images?.[0] || 'https://via.placeholder.com/300x200';
            
            return (
              <Link
                key={idx}
                to={`/products?category=${cat}`}
                className="flex-shrink-0 w-44 group"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className={`relative overflow-hidden h-32 bg-slate-100 border border-slate-200 transition-all duration-300 ${hoveredIdx === idx ? 'scale-125 -translate-y-8 animate-shake' : ''}`}>
                  <img
                    src={image}
                    alt={cat}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-all" />
                  <div className="absolute inset-0 flex items-end p-4">
                    <div className="flex flex-col gap-2 w-full">
                      <h3 className="text-white font-bold text-lg">{cat}</h3>
                      <button className="text-slate-600 hover:text-black font-semibold text-xs cursor-pointer w-fit">
                        Explore
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {/* Duplicate for seamless loop */}
          {categories.map((cat, idx) => {
            const product = categoryProducts[cat];
            const image = product?.images?.[0] || 'https://via.placeholder.com/300x200';
            
            return (
              <Link
                key={`dup-${idx}`}
                to={`/products?category=${cat}`}
                className="flex-shrink-0 w-44 group"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className={`relative overflow-hidden h-32 bg-slate-100 border border-slate-200 transition-all duration-300 ${hoveredIdx === idx ? 'scale-125 -translate-y-8 animate-shake' : ''}`}>
                  <img
                    src={image}
                    alt={cat}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-all" />
                  <div className="absolute inset-0 flex items-end p-4">
                    <div className="flex flex-col gap-2 w-full">
                      <h3 className="text-white font-bold text-lg">{cat}</h3>
                      <button className="text-slate-600 hover:text-black font-semibold text-xs cursor-pointer w-fit">
                        Explore
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-shake {
          animation: shake 0.5s infinite;
        }
      `}</style>
    </div>
  );
};

export default ShopByCategory;
