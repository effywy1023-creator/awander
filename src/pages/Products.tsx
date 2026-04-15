import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/supabase-db';
import { LogOut, Compass, BookOpen } from 'lucide-react';

interface ProductInfo {
  product_id: string;
  name: string;
  description: string | null;
  theme: string | null;
}

const Products = () => {
  const { userId, displayName, isAdmin, isLoggedIn, loading: authLoading, logout, setProduct } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      navigate('/login', { replace: true });
      return;
    }
    loadProducts();
  }, [isLoggedIn, authLoading]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('user_products')
        .select('product_id, products(id, name, description, theme)')
        .eq('user_id', userId!);

      if (error) throw error;

      const mapped: ProductInfo[] = (data || [])
        .filter((d: any) => d.products)
        .map((d: any) => ({
          product_id: d.product_id,
          name: d.products.name,
          description: d.products.description,
          theme: d.products.theme,
        }));

      setProducts(mapped);

      // Auto-navigate if single product
      if (mapped.length === 1) {
        setProduct(mapped[0].product_id);
        navigate('/map', { replace: true });
        return;
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const selectProduct = (productId: string) => {
    setProduct(productId);
    navigate('/map');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 pb-20 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">选择探索世界</h1>
          <p className="text-sm text-muted-foreground mt-1">{displayName}，欢迎回来</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      {isAdmin && (
        <Card
          className="border-none shadow-md bg-primary/10 cursor-pointer hover:shadow-lg transition-shadow mb-4"
          onClick={() => navigate('/admin/notes')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-foreground">宝藏印记</h2>
              <p className="text-xs text-muted-foreground">查看所有学员的探险笔记</p>
            </div>
          </CardContent>
        </Card>
      )}

      {products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Compass className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>你还没有可探索的世界</p>
          <p className="text-sm mt-2">请联系老师开通权限</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {products.map((p) => (
            <Card
              key={p.product_id}
              className="border-none shadow-md bg-card/70 backdrop-blur-sm cursor-pointer hover:shadow-lg active:scale-[0.98] transition-all"
              onClick={() => selectProduct(p.product_id)}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Compass className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-medium text-foreground">{p.name}</h2>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
