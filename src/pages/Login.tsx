import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAppConfig } from '@/hooks/use-app-config';
import { Compass } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useAppConfig();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('请输入完整信息');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) throw error;
      navigate('/products');
    } catch (err: any) {
      toast.error(err.message || '登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-sm border-none shadow-lg bg-card/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 px-6 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Compass className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {t('login_title', '身体藏宝图 · 寻宝行动')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('login_subtitle', '输入你的邮箱和密码，开始今日的地图解锁。')}
            </p>
          </div>

          <div className="w-full flex flex-col gap-4">
            <Input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl bg-background/60 border-border/50 text-center"
            />
            <Input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="h-12 rounded-xl bg-background/60 border-border/50 text-center"
            />
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="h-12 rounded-xl text-base font-medium"
            >
              {loading ? '验证中...' : t('login_button', '立即开始')}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            还没有账号？{' '}
            <Link to="/register" className="text-primary underline underline-offset-2 hover:text-primary/80">
              立即注册
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
