import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

interface NoteWithLevel {
  id: string;
  content: string;
  created_at: string;
  level_id: string;
  level_name: string;
}

type GroupMode = 'time' | 'level';

const Notes = () => {
  const { userId, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteWithLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupMode, setGroupMode] = useState<GroupMode>('time');

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      navigate('/login', { replace: true });
      return;
    }
    loadNotes();
  }, [isLoggedIn, authLoading]);

  const loadNotes = async () => {
    try {
      const { data: notesData } = await supabase
        .from('treasure_notes')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });

      if (!notesData || notesData.length === 0) {
        setNotes([]);
        setLoading(false);
        return;
      }

      const levelIds = [...new Set((notesData as any[]).map((n) => n.level_id))];
      const { data: levelsData } = await supabase
        .from('levels')
        .select('id, name')
        .in('id', levelIds);

      const levelNameMap: Record<string, string> = {};
      ((levelsData as any[]) || []).forEach((l) => (levelNameMap[l.id] = l.name));

      setNotes(
        (notesData as any[]).map((n) => ({
          id: n.id,
          content: n.content,
          created_at: n.created_at,
          level_id: n.level_id,
          level_name: levelNameMap[n.level_id] || '未知关卡',
        }))
      );
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const groupedByLevel = () => {
    const groups: Record<string, NoteWithLevel[]> = {};
    for (const note of notes) {
      if (!groups[note.level_id]) groups[note.level_id] = [];
      groups[note.level_id].push(note);
    }
    return Object.values(groups);
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto p-5 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/map')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">探险笔记</h1>
      </div>

      <div className="flex rounded-full p-1 bg-card border border-border/50 mb-5 w-fit mx-auto">
        {(['time', 'level'] as GroupMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setGroupMode(mode)}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
              groupMode === mode
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {mode === 'time' ? '按时间' : '按关卡'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-20">
          尚未留下任何探险笔记
        </p>
      ) : groupMode === 'time' ? (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-muted/50 rounded-xl p-3">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {note.content}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(note.created_at + 'Z').toLocaleString('zh-CN', { timeZone: 'Asia/Singapore' })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {note.level_name}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groupedByLevel().map((group) => (
            <div key={group[0].level_id}>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {group[0].level_name}
              </h2>
              <div className="flex flex-col gap-2">
                {group.map((note) => (
                  <div key={note.id} className="bg-muted/50 rounded-xl p-3">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(note.created_at + 'Z').toLocaleString('zh-CN', { timeZone: 'Asia/Singapore' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notes;
