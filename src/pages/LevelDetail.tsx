import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useAppConfig } from '@/hooks/use-app-config';
import { ArrowLeft, Play, Pause, RotateCcw, BookOpen, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Asset {
  id: string;
  type: string;
  name: string;
  content_url: string;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
}

const LevelDetail = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const { userId, isLoggedIn, currentProductId, loading: authLoading } = useAuth();
  const { t } = useAppConfig();

  const [levelName, setLevelName] = useState('');
  const [loreText, setLoreText] = useState('');
  const [childLevels, setChildLevels] = useState<{ id: string; name: string; unlocked: boolean }[]>([]);
  const [audioAssets, setAudioAssets] = useState<Asset[]>([]);
  const [writingPrompt, setWritingPrompt] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentAssetId, setCurrentAssetId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const [resumePrompt, setResumePrompt] = useState<{ assetId: string; pos: number } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      navigate('/login', { replace: true });
      return;
    }
    setAudioAssets([]);
    loadLevel();
    loadNotes();
    setChildLevels(prev => prev.map(child => ({ ...child, unlocked: true })));
    loadChildLevels();
  }, [levelId, isLoggedIn, authLoading]);

  const loadChildLevels = async () => {
    try {
      const { data: children } = await supabase
        .from('levels')
        .select('id, name, parent_id')
        .eq('parent_id', levelId!);

      if (!children || children.length === 0) {
        setChildLevels([]);
        return;
      }

      const { data: notesData } = await supabase
        .from('treasure_notes')
        .select('level_id')
        .eq('user_id', userId!)
        .eq('level_id', levelId!);

      const hasNote = (notesData || []).length > 0;

      setChildLevels(
        (children as any[]).map((c) => ({
          id: c.id,
          name: c.name,
          unlocked: hasNote,
        }))
      );
    } catch {
      // silent
    }
  };

  const loadLevel = async () => {
    try {
      const { data: level } = await supabase
        .from('levels')
        .select('*')
        .eq('id', levelId!)
        .single();

      if (!level) return;
      setLevelName((level as any).name);
      setLoreText((level as any).lore_text || '');

      const audioIds = ((level as any).audio_ids || []) as string[];
      if (audioIds.length > 0) {
        const { data: assets } = await supabase
          .from('assets')
          .select('*')
          .in('id', audioIds);
        if (assets) {
          const ordered = audioIds
            .map((id) => (assets as any[]).find((a) => a.id === id))
            .filter(Boolean) as Asset[];
          setAudioAssets(ordered);
        }
      }

      if ((level as any).writing_id) {
        const { data: writingAsset } = await supabase
          .from('assets')
          .select('*')
          .eq('id', (level as any).writing_id)
          .maybeSingle();
        if (writingAsset) {
          setWritingPrompt((writingAsset as any).content_url || '');
        }
      }
    } catch {
      toast.error('加载关卡失败');
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    const { data } = await supabase
      .from('treasure_notes')
      .select('*')
      .eq('user_id', userId!)
      .eq('level_id', levelId!)
      .order('created_at', { ascending: false });
    if (data) setNotes(data as any[]);
  };

  const playAudio = async (asset: Asset) => {
    if (currentAssetId === asset.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      stopProgressTracking();
      return;
    }

    if (currentAssetId === asset.id && !isPlaying) {
      audioRef.current?.play();
      setIsPlaying(true);
      startProgressTracking(asset.id);
      return;
    }

    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId!)
      .eq('level_id', levelId!)
      .eq('asset_id', asset.id)
      .maybeSingle();

    if (progress && (progress as any).last_pos > 0) {
      setResumePrompt({ assetId: asset.id, pos: (progress as any).last_pos });
    } else {
      startNewAudio(asset, 0);
    }
  };

  const startNewAudio = (asset: Asset, startPos: number) => {
    setCurrentAssetId(asset.id);
    setResumePrompt(null);
    if (audioRef.current) {
      audioRef.current.src = asset.content_url;
      audioRef.current.currentTime = startPos;
      audioRef.current.play();
      setIsPlaying(true);
      startProgressTracking(asset.id);
    }
  };

  const startProgressTracking = (assetId: string) => {
    stopProgressTracking();
    progressIntervalRef.current = window.setInterval(async () => {
      if (audioRef.current) {
        const pos = audioRef.current.currentTime;
        try {
          const { data: existing } = await supabase
            .from('user_progress')
            .select('id, total_sec')
            .eq('user_id', userId!)
            .eq('level_id', levelId!)
            .eq('asset_id', assetId)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('user_progress')
              .update({
                last_pos: pos,
                total_sec: ((existing as any).total_sec || 0) + 10,
                updated_at: new Date().toISOString(),
              })
              .eq('id', (existing as any).id);
          } else {
            await supabase
              .from('user_progress')
              .insert({
                user_id: userId!,
                level_id: levelId!,
                asset_id: assetId,
                last_pos: pos,
                total_sec: pos,
                updated_at: new Date().toISOString(),
              });
          }
        } catch (err) {
          console.error('Progress sync failed', err);
        }
      }
    }, 10000);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    stopProgressTracking();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const saveNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const { error } = await supabase.from('treasure_notes').insert({
        user_id: userId!,
        level_id: levelId!,
        content: newNote.trim(),
      });
      if (error) throw error;
      setNewNote('');
      toast.success(t('save_success', '你的发现已存入宝箱 ✨'));
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#B87333', '#D4A76A', '#8B6914', '#F5DEB3'],
      });
      loadNotes();
      loadChildLevels();

      // Check if all levels completed
      const { data: route } = await supabase
        .from('routes')
        .select('level_ids')
        .eq('product_id', currentProductId!)
        .maybeSingle();

      if (route?.level_ids) {
        const allLevelIds = route.level_ids as string[];
        const { data: completedNotes } = await supabase
          .from('treasure_notes')
          .select('level_id')
          .eq('user_id', userId!);
        const completedIds = new Set((completedNotes as any[] || []).map((n) => n.level_id));
        const allDone = allLevelIds.every((id) => completedIds.has(id));
        if (allDone) {
          localStorage.setItem('show_medal', 'true');
        }
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setSavingNote(false);
    }
  };

  useEffect(() => {
    return () => stopProgressTracking();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto p-5 pb-20">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/map')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">{levelName}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate('/notes')}>
          <BookOpen className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      {loreText && (
        <div className="mb-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{t('lore_title', '导引')}</h2>
          <div className="bg-accent/10 rounded-xl p-4">
            {loreText.split('---').map((part, index) => (
              <div key={index}>
                {index > 0 && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 border-t border-primary/20" />
                    <span className="text-xs text-primary/50">✦</span>
                    <div className="flex-1 border-t border-primary/20" />
                  </div>
                )}
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {part.trim()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {resumePrompt && (
        <Card className="border-none shadow-md bg-accent/20 mb-4">
          <CardContent className="p-4 flex flex-col gap-3">
            <p className="text-sm text-foreground">
              上次播放到 {formatTime(resumePrompt.pos)}，是否继续？
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  const asset = audioAssets.find((a) => a.id === resumePrompt.assetId);
                  if (asset) startNewAudio(asset, resumePrompt.pos);
                }}
              >
                继续播放
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="rounded-xl"
                onClick={() => {
                  const asset = audioAssets.find((a) => a.id === resumePrompt.assetId);
                  if (asset) startNewAudio(asset, 0);
                }}
              >
                <RotateCcw className="w-3 h-3 mr-1" /> 从头开始
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="mb-6">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{t('audio_section_title', '探索指南')}</h2>
        <div className="flex flex-col gap-3">
          {audioAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">尚未在此留下标记</p>
          ) : (
            audioAssets.map((asset) => (
              <Card
                key={asset.id}
                className={`border-none shadow-sm cursor-pointer transition-all ${
                  currentAssetId === asset.id
                    ? 'bg-primary/10 shadow-md'
                    : 'bg-card/70'
                }`}
                onClick={() => playAudio(asset)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {currentAssetId === asset.id && isPlaying ? (
                      <Pause className="w-4 h-4 text-primary" />
                    ) : (
                      <Play className="w-4 h-4 text-primary ml-0.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {asset.name}
                    </p>
                    {currentAssetId === asset.id && (
                      <div className="mt-2">
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{
                              width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(currentTime)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(duration)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          {t('writing_section_title', '挖掘今日宝藏')}
        </h2>

        {writingPrompt && (
          <div className="bg-accent/10 rounded-xl p-4 mb-4">
            <p className="text-sm leading-relaxed text-muted-foreground italic whitespace-pre-wrap">{writingPrompt}</p>
          </div>
        )}

        <Textarea
          placeholder={t('writing_placeholder', '记录下你刚才发现的闪光点...')}
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="min-h-[120px] rounded-xl bg-background/60 border-border/50 resize-none mb-3"
        />
        <Button
          onClick={saveNote}
          disabled={savingNote || !newNote.trim()}
          className="w-full h-11 rounded-xl"
        >
          {savingNote ? '标记中...' : t('save_button_text', '标记此处 📌')}
        </Button>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          {t('history_section_title', '藏宝标记点')}
        </h2>
        {notes.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground text-center py-6">
            {t('empty_notes', '尚未在此留下标记')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.map((note) => (
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
        )}
      </section>

      {childLevels.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            下一站
          </h2>
          <div className={`flex gap-3 ${childLevels.length > 1 ? 'flex-row' : 'flex-col'}`}>
            {childLevels.map((child) => (
              <Button
                key={child.id}
                variant={child.unlocked ? 'default' : 'secondary'}
                disabled={!child.unlocked && !newNote.trim()}
                className="flex-1 h-11 rounded-xl"
                onClick={() => {
                  window.scrollTo(0, 0);
                  navigate(`/level/${child.id}`);
                }}
              >
                {childLevels.length === 1 ? t('next_level_button', '下一关') : child.name}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default LevelDetail;
