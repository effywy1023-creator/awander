import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAppConfig } from '@/hooks/use-app-config';
import { Compass } from 'lucide-react';
import { toast } from 'sonner';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useAppConfig();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error('请填写所有字段');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: { display_name: name.trim() },
        },
      });
      if (error) throw error;
      toast.success('注册成功，请登录');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || '注册失败，请稍后重试');
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
              {t('register_title', '创建探险者账号')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('register_subtitle', '注册后即可开始你的探险之旅')}
            </p>
          </div>

          <div className="w-full flex flex-col gap-4">
            <Input
              placeholder="你的名字"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl bg-background/60 border-border/50 text-center"
            />
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
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              className="h-12 rounded-xl bg-background/60 border-border/50 text-center"
            />
            <Button
              onClick={handleRegister}
              disabled={loading}
              className="h-12 rounded-xl text-base font-medium"
            >
              {loading ? '注册中...' : '立即注册'}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            已有账号？{' '}
            <Link to="/login" className="text-primary underline underline-offset-2 hover:text-primary/80">
              直接登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
