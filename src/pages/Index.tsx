import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const Index = () => {
  const { isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (isLoggedIn) {
      navigate('/products', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [isLoggedIn, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">加载中...</div>
    </div>
  );
};

export default Index;
