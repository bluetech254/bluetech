import React from 'react';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const posts = [
  {
    slug: 'how-to-extend-phone-battery-life',
    title: 'How to Extend Your Phone Battery Life',
    date: 'July 28, 2026',
    category: 'Tips & Tricks',
    excerpt: 'Simple habits that can double your battery lifespan and keep your device running longer between charges.',
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=400&fit=crop',
  },
  {
    slug: 'signs-your-phone-screen-needs-replacing',
    title: '5 Signs Your Phone Screen Needs Replacing',
    date: 'July 15, 2026',
    category: 'Repair Guides',
    excerpt: 'From dead pixels to unresponsive touch — learn when a screen repair is unavoidable.',
    image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&h=400&fit=crop',
  },
  {
    slug: 'original-vs-aftermarket-parts',
    title: 'Original vs Aftermarket Parts: What You Need to Know',
    date: 'July 5, 2026',
    category: 'Buying Guide',
    excerpt: 'We break down the real differences in quality, warranty, and price so you can make an informed choice.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop',
  },
  {
    slug: 'water-damage-first-steps',
    title: 'Water Damage: The First 10 Minutes Matter',
    date: 'June 20, 2026',
    category: 'Repair Guides',
    excerpt: 'What to do — and what NOT to do — immediately after your phone gets wet.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
  },
  {
    slug: 'best-budget-smartphones-kenya-2026',
    title: 'Best Budget Smartphones in Kenya 2026',
    date: 'June 10, 2026',
    category: 'Buying Guide',
    excerpt: 'Our top picks under KSH 15,000 that deliver solid performance without breaking the bank.',
    image: 'https://images.unsplash.com/photo-1511707267537-b85faf00021e?w=600&h=400&fit=crop',
  },
  {
    slug: 'how-to-spot-fake-chargers',
    title: 'How to Spot a Fake Charger Before It Damages Your Phone',
    date: 'May 30, 2026',
    category: 'Tips & Tricks',
    excerpt: 'Counterfeit chargers are everywhere. Here\'s how to identify them and protect your device.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
  },
];

const categoryColors: Record<string, string> = {
  'Tips & Tricks': 'bg-blue-100 text-blue-700',
  'Repair Guides': 'bg-orange-100 text-orange-700',
  'Buying Guide': 'bg-green-100 text-green-700',
};

export const BlogPage = () => (
  <div className="space-y-8 animate-fade-in">
    <div>
      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">
        / <span className="text-blue-600">Blog</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
        <BookOpen className="w-7 h-7 text-blue-600" /> BlueTech Blog
      </h1>
      <p className="text-sm text-slate-500 mt-1">Tech tips, repair guides, and buying advice from our engineers.</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map(post => (
        <div key={post.slug} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
          <div className="h-44 overflow-hidden">
            <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${categoryColors[post.category] || 'bg-slate-100 text-slate-600'}`}>
                {post.category}
              </span>
              <span className="text-xs text-slate-400">{post.date}</span>
            </div>
            <h2 className="font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">{post.title}</h2>
            <p className="text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>
            <Link to={`/blog/${post.slug}`} className="inline-flex items-center text-xs font-bold text-blue-600 hover:underline">
              Read more →
            </Link>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default BlogPage;
