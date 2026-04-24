import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/supabase-db';
import { useAppConfig } from '@/hooks/use-app-config';
import { Compass } from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';
import { useAuth } from '@/lib/auth';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useAppConfig();
  const { setAuth } = useAuth();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error('请输入完整信息');
      return;
    }
    setLoading(true);
    try {
      const { data: user, error } = await db
        .from('users')
        .select('id, username, display_name, password_hash, is_admin')
        .eq('username', username.trim())
        .maybeSingle();

      if (error) throw error;

      if (!user) {
        toast.error('用户名或密码错误');
        return;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        toast.error('用户名或密码错误');
        return;
      }

      setAuth(user.id, user.username, user.display_name, user.is_admin);
      navigate('/products');
    } catch (err: any) {
      toast.error(err.message || '登录失败，请稍后再试');
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
              {t('login_subtitle', '输入你的暗号，开始今日的探险。')}
            </p>
          </div>
          <div className="w-full flex flex-col gap-4">
            <Input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
          {/* 注册入口暂时隐藏，路由 /register 保留 */}
          <p className="text-sm text-muted-foreground" style={{ display: 'none' }}>
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
