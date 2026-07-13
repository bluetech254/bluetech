import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProductById, getProducts } from '../api/products';
import { Product } from '../types';
import ProductDetail from '../components/products/ProductDetail';
import SectionCarousel from '../components/products/SectionCarousel';
import Loading from '../components/common/Loading';
import { ChevronLeft } from 'lucide-react';

export const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchDetailAndRelated = async () => {
      setLoading(true);
      setError(null);
      try {
        const item = await getProductById(id);
        setProduct(item);
        
        // Fetch related products of the same category
        if (item.category) {
          const allRes = await getProducts({ limit: 200 });
          const itemsFiltered = (allRes.products || []).filter(p => p.id !== id && p.category === item.category);
          setRelatedProducts(itemsFiltered);
        }
      } catch (err: any) {
        console.error('Failed to load product detail:', err);
        setError(err.response?.data?.message || 'Failed to retrieve product details. The requested product might not exist or the connection fell out.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetailAndRelated();
  }, [id]);

  if (loading) {
    return <Loading fullScreen message="Loading product specs..." />;
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-6">
        <div className="p-6 bg-red-50 border border-red-100 rounded-2xl">
          <h2 className="text-lg font-bold text-red-800 mb-1">Product Not Found</h2>
          <p className="text-xs text-red-600 mb-4">{error || 'The requested product could not be resolved.'}</p>
          <Link to="/products" className="inline-flex items-center text-xs font-bold text-blue-600 hover:underline">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 py-6 animate-fade-in text-left">
      {/* Breadcrumbs & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider space-x-1">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-blue-600">Products</Link>
          <span>/</span>
          <span className="hover:text-blue-600 capitalize">{product.category}</span>
          <span>/</span>
          <span className="text-slate-600 truncate max-w-40 inline-block align-bottom">{product.name}</span>
        </div>
        
        <Link to="/products" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Products Catalog
        </Link>
      </div>

      {/* Main product display card */}
      <ProductDetail product={product} />

      {/* More Like This */}
      {relatedProducts.length > 0 && (
        <div className="pt-6 border-t border-slate-100">
          <SectionCarousel
            title={`More ${product.category} Products`}
            emoji="🛍️"
            products={relatedProducts}
          />
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
