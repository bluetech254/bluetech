import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PointsCard } from '../components/points/PointsCard';
import Loading from '../components/common/Loading';

const PointsPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/login', { state: { from: { pathname: '/points' } } });
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) return <Loading fullScreen message="Loading..." />;
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-black text-slate-900 mb-5">My Points</h1>
        <PointsCard variant="full" />
      </div>
    </div>
  );
};

export default PointsPage;
