import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../../api/products';

const POPULAR = ['Smartphones', 'Laptops', 'Tablets', 'Speakers', 'Cameras', 'Headphones', 'Monitors', 'Processors'];

export const ProductCategoriesGrid = () => {
  const navigate = useNavigate();
  const [cats, setCats] = useState<{ name: string; img: string }[]>([]);

  useEffect(() => {
    getProducts({ limit: 200 }).then(r => {
      const products = r.products || [];
      const fetched = new Set(products.map((p: any) => (p.category || '').toLowerCase()));
      const matched = POPULAR.filter(c => fetched.has(c.toLowerCase()));
      const final = matched.length >= 8 ? matched : [
        ...matched,
        ...Array.from(fetched).filter(c => !matched.map(m => m.toLowerCase()).includes(c as string))
      ].slice(0, 8) as string[];

      setCats(final.map(name => {
        const product = products.find((p: any) => (p.category || '').toLowerCase() === name.toLowerCase());
        const img = product?.images?.[0] || product?.image_url || '';
        return { name, img };
      }));
    }).catch(() => {});
  }, []);

  if (cats.length === 0) return null;

  const go = (cat: string) => navigate(`/products?category=${encodeURIComponent(cat)}`);

  const Card = ({ name, img }: { name: string; img: string }) => (
    <button onClick={() => go(name)}
      className="relative overflow-hidden rounded-xl h-20 group cursor-pointer">
      {img
        ? <img src={img} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        : <div className="w-full h-full bg-slate-300" />}
      <div className="absolute inset-0 bg-black/60 group-hover:bg-black/70 transition-colors" />
      <span className="absolute bottom-2 left-0 right-0 text-center text-white font-bold text-xs sm:text-sm px-1 leading-tight">
        {name}
      </span>
    </button>
  );

  return (
    <div>
      {/* 8×1 row — desktop */}
      <div className="hidden sm:grid grid-cols-8 gap-2">
        {cats.map(c => <Card key={c.name} {...c} />)}
      </div>
      {/* 4×2 grid — mobile */}
      <div className="sm:hidden grid grid-cols-4 gap-2">
        {cats.map(c => <Card key={c.name} {...c} />)}
      </div>
    </div>
  );
};

export default ProductCategoriesGrid;
