import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

interface NoteEntry {
  student_name: string;
  level_name: string;
  content: string;
  created_at: string;
}

const AdminNotes = () => {
  const { isLoggedIn, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<string[]>([]);
  const [levelNames, setLevelNames] = useState<string[]>([]);
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !isAdmin) {
      navigate('/products', { replace: true });
    }
  }, [isLoggedIn, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    fetchData();
  }, [isAdmin, authLoading]);

  const fetchData = async () => {
    setLoading(true);

    const { data: notesData } = await supabase
      .from('treasure_notes')
      .select('user_id, content, created_at, level_id')
      .order('created_at', { ascending: false });

    const { data: profilesData } = await supabase
      .from('user_profiles')
      .select('id, display_name');

    const { data: levelsData } = await supabase
      .from('levels')
      .select('id, name');

    if (notesData && profilesData && levelsData) {
      const userMap: Record<string, string> = {};
      (profilesData as any[]).forEach((u) => { userMap[u.id] = u.display_name; });

      const levelMap: Record<string, string> = {};
      (levelsData as any[]).forEach((l) => { levelMap[l.id] = l.name; });

      const mapped: NoteEntry[] = (notesData as any[]).map((n) => ({
        student_name: userMap[n.user_id] || n.user_id,
        level_name: levelMap[n.level_id] || '未知关卡',
        content: n.content,
        created_at: n.created_at,
      }));

      setNotes(mapped);
      setStudents([...new Set((profilesData as any[]).map((u) => u.display_name as string))].sort());
      setLevelNames([...new Set((levelsData as any[]).map((l) => l.name as string))]);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (filterStudent !== 'all' && n.student_name !== filterStudent) return false;
      if (filterLevel !== 'all' && n.level_name !== filterLevel) return false;
      return true;
    });
  }, [notes, filterStudent, filterLevel]);

  if (!isAdmin && !authLoading) return null;

  return (
    <div className="min-h-screen p-5 pb-20 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">宝藏印记</h1>
      </div>

      <div className="flex gap-3 mb-6">
        <Select value={filterStudent} onValueChange={setFilterStudent}>
          <SelectTrigger className="flex-1 h-10 rounded-xl bg-card border-border/50">
            <SelectValue placeholder="全部学员" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部学员</SelectItem>
            {students.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="flex-1 h-10 rounded-xl bg-card border-border/50">
            <SelectValue placeholder="全部关卡" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部关卡</SelectItem>
            {levelNames.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">加载中…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">暂无笔记</p>
      ) : (
        <div>
          {filtered.map((note, i) => (
            <div key={i} className="bg-muted/50 rounded-xl p-3 mb-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{note.student_name}</span>
                <span className="text-xs text-muted-foreground">{note.level_name}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {note.created_at ? new Date(note.created_at + 'Z').toLocaleString('zh-CN', { timeZone: 'Asia/Singapore' }) : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNotes;
