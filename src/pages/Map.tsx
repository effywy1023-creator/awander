import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/supabase-db';
import { useAppConfig } from '@/hooks/use-app-config';
import { LogOut, Lock, MapPin, Tent, Compass, Waves, Sun, DoorOpen, Mountain, Cloud, Flame, Trees, BookOpen, Sparkles, ArrowLeft, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

const LEVEL_ICON_MAP: Record<string, LucideIcon> = {
  '欢迎入营': Tent,
  '第一次远行': Compass,
  '深处的湖泊': Waves,
  '大地平原': Sun,
  '峡谷入口': DoorOpen,
  '山脉': Mountain,
  '山脉背面': Cloud,
  '河边营地': Flame,
  '古老森林': Trees,
};

const getLevelIcon = (name: string): LucideIcon => LEVEL_ICON_MAP[name] || MapPin;

interface Level {
  id: string;
  name: string;
  audio_ids: string[];
  writing_id: string | null;
  map_intro: string | null;
  parent_id: string | null;
  x: number;
  y: number;
  unlock_condition: string | null;
  is_free_explore?: boolean;
}

type LevelStatus = 'undiscovered' | 'in_progress' | 'completed';
type ViewMode = 'map' | 'list';

const BASE_WIDTH = 600;
const BASE_NODE_SIZE = 56;

const Map = () => {
  const { userId, displayName, isAdmin, isLoggedIn, currentProductId, loading: authLoading, logout, setProduct } = useAuth();
  const navigate = useNavigate();
  const { t } = useAppConfig();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMap, setStatusMap] = useState<Record<string, LevelStatus>>({});
  const [unlockedSet, setUnlockedSet] = useState<Set<string>>(new Set());
  const [routeDisplayName, setRouteDisplayName] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem('preferred_view') as ViewMode) || 'map'
  );
  const [scale, setScale] = useState(1);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [allCompleted, setAllCompleted] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [showMedalModal, setShowMedalModal] = useState(false);
  const [hasMultipleProducts, setHasMultipleProducts] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setScale(Math.min(w / BASE_WIDTH, 1));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (localStorage.getItem('show_medal') === 'true') {
      localStorage.removeItem('show_medal');
      setShowMedalModal(true);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      navigate('/login', { replace: true });
      return;
    }
    if (!currentProductId) {
      navigate('/products', { replace: true });
      return;
    }
    loadLevels();
    checkMultipleProducts();
  }, [isLoggedIn, authLoading, currentProductId]);

  const checkMultipleProducts = async () => {
    const { data } = await supabase
      .from('user_products')
      .select('product_id')
      .eq('user_id', userId!);
    setHasMultipleProducts((data || []).length > 1);
  };

  const loadLevels = async () => {
    try {
      const { data: route, error: routeErr } = await supabase
        .from('routes')
        .select('*')
        .eq('product_id', currentProductId!)
        .maybeSingle();

      if (routeErr) throw routeErr;
      if (!route || !route.level_ids) {
        setLevels([]);
        setLoading(false);
        return;
      }

      setRouteDisplayName((route as any).display_name || null);

      const levelIds = route.level_ids as string[];
      if (levelIds.length === 0) {
        setLevels([]);
        setLoading(false);
        return;
      }

      const { data: levelsData, error: levelsErr } = await supabase
        .from('levels')
        .select('*')
        .in('id', levelIds);

      if (levelsErr) throw levelsErr;

      const ordered = levelIds
        .map((id) => (levelsData as any[])?.find((l) => l.id === id))
        .filter(Boolean) as Level[];

      setLevels(ordered);

      const [progressRes, notesRes, totalSecRes, noteCountRes] = await Promise.all([
        supabase
          .from('user_progress')
          .select('level_id')
          .eq('user_id', userId!),
        supabase
          .from('treasure_notes')
          .select('level_id')
          .eq('user_id', userId!),
        supabase
          .from('user_progress')
          .select('total_sec')
          .eq('user_id', userId!),
        supabase
          .from('treasure_notes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!),
      ]);

      const progressLevels = new Set((progressRes.data as any[] || []).map((p) => p.level_id));
      const noteLevels = new Set((notesRes.data as any[] || []).map((n) => n.level_id));

      const sumSec = (totalSecRes.data as any[] || []).reduce((acc, r) => acc + (r.total_sec || 0), 0);
      setTotalMinutes(Math.floor(sumSec / 60));
      setNoteCount(noteCountRes.count || 0);

      const sMap: Record<string, LevelStatus> = {};
      for (const level of ordered) {
        if (noteLevels.has(level.id)) {
          sMap[level.id] = 'completed';
        } else if (progressLevels.has(level.id)) {
          sMap[level.id] = 'in_progress';
        } else {
          sMap[level.id] = 'undiscovered';
        }
      }
      setStatusMap(sMap);
      const completedLevels = ordered.filter(l => noteLevels.has(l.id)).length;
      setCompletedCount(completedLevels);
      const isAllDone = ordered.every(l => sMap[l.id] === 'completed');
      setAllCompleted(isAllDone);

      const unlocked = new Set<string>();
      for (const level of ordered) {
        if (!level.parent_id) {
          unlocked.add(level.id);
        } else if (noteLevels.has(level.parent_id)) {
          unlocked.add(level.id);
        }
      }
      setUnlockedSet(unlocked);
    } catch (err) {
      toast.error('加载航线失败');
    } finally {
      setLoading(false);
    }
  };

  const levelMap = useMemo(() => {
    const m: Record<string, Level> = {};
    for (const l of levels) m[l.id] = l;
    return m;
  }, [levels]);

  const nodeSize = BASE_NODE_SIZE * scale;

  const containerHeight = useMemo(() => {
    if (levels.length === 0) return 0;
    const maxY = Math.max(...levels.map((l) => l.y));
    return (maxY + BASE_NODE_SIZE + 40) * scale;
  }, [levels, scale]);

  const getStatusLabel = useCallback((status: LevelStatus) => {
    switch (status) {
      case 'completed':
        return t('status_completed', '已标记');
      case 'in_progress':
        return `✨ ${t('status_in_progress', '探索中')}`;
      default:
        return t('status_undiscovered', '待发现');
    }
  }, [t]);

  const getStatusColor = (status: LevelStatus) => {
    switch (status) {
      case 'completed':
        return 'border border-dashed border-[hsl(25,30%,50%)] text-[hsl(15,40%,30%)] bg-[hsl(43,50%,82%,0.15)]';
      case 'in_progress':
        return 'text-[hsl(16,60%,40%)] bg-[hsl(36,30%,88%,0.3)]';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div ref={containerRef} className="min-h-screen p-5 pb-20 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {hasMultipleProducts && (
            <Button variant="ghost" size="icon" onClick={() => { setProduct(''); navigate('/products'); }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {routeDisplayName || t('map_title', '你的觉知航线')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                {isAdmin ? (
                  <button
                    onClick={() => navigate('/admin/notes')}
                    className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors"
                  >
                    {displayName}，欢迎回来
                  </button>
                ) : (
                  <>{displayName}，欢迎回来</>
                )}
                {allCompleted && (
                  <button onClick={() => setShowMedalModal(true)}>
                    <Sparkles className="w-4 h-4 text-amber-600" />
                  </button>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                探索时间：{totalMinutes} 分钟｜探索笔记：{noteCount} 条
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate('/notes')}>
            <BookOpen className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex rounded-full p-1 bg-card border border-border/50 mb-5 w-fit mx-auto">
        {(['map', 'list'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setViewMode(mode);
              localStorage.setItem('preferred_view', mode);
            }}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
              viewMode === mode
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {mode === 'map' ? '地图' : '列表'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </div>
      ) : levels.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>暂无可用关卡</p>
          <p className="text-sm mt-2">请联系管理员配置航线</p>
        </div>
      ) : viewMode === 'map' ? (
        <div className="relative w-full" style={{ height: containerHeight }}>
          <svg className="absolute inset-0 pointer-events-none w-full h-full">
            {levels.map((level) => {
              if (!level.parent_id) return null;
              const parent = levelMap[level.parent_id];
              if (!parent) return null;

              const x1 = parent.x * scale + nodeSize / 2;
              const y1 = parent.y * scale + nodeSize / 2;
              const x2 = level.x * scale + nodeSize / 2;
              const y2 = level.y * scale + nodeSize / 2;

              const mx = (x1 + x2) / 2 + (y2 - y1) * 0.15;
              const my = (y1 + y2) / 2;

              return (
                <path
                  key={`line-${level.id}`}
                  d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                  fill="none"
                  stroke="hsl(40, 70%, 30%)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  opacity={0.6}
                />
              );
            })}
          </svg>

          {levels.map((level) => {
            const isUnlocked = unlockedSet.has(level.id);
            const status = statusMap[level.id] || 'undiscovered';

            return (
              <div
                key={level.id}
                className="absolute flex flex-col items-center"
                style={{
                  left: level.x * scale,
                  top: level.y * scale,
                  width: nodeSize,
                }}
              >
                {isUnlocked ? (
                  <button
                    onClick={() => navigate(`/level/${level.id}`)}
                    className={`rounded-full flex items-center justify-center font-bold transition-all active:scale-95 shadow-md border-2 ${
                      status === 'completed'
                        ? 'bg-primary/20 border-primary text-primary border-dashed'
                        : status === 'in_progress'
                          ? 'bg-primary/10 border-primary/60 text-primary'
                          : 'bg-card border-primary/40 text-primary/70'
                    }`}
                    style={{ width: nodeSize, height: nodeSize }}
                  >
                    {(() => { const Icon = getLevelIcon(level.name); return <Icon style={{ width: nodeSize * 0.4, height: nodeSize * 0.4 }} />; })()}
                  </button>
                ) : (
                  <div
                    className="rounded-full flex items-center justify-center bg-muted border-2 border-muted-foreground/20 text-muted-foreground/40"
                    style={{ width: nodeSize, height: nodeSize, filter: 'blur(2px)' }}
                  >
                    <Lock style={{ width: nodeSize * 0.36, height: nodeSize * 0.36 }} />
                  </div>
                )}

                {isUnlocked && status === 'in_progress' && (
                  <span className="text-xs mt-1 animate-pulse">✨</span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {levels.map((level, idx) => {
            const status = statusMap[level.id] || 'undiscovered';
            const isUnlocked = unlockedSet.has(level.id);
            return (
              <Card
                key={level.id}
                className={`border-none shadow-md bg-card/70 backdrop-blur-sm transition-shadow ${
                  isUnlocked
                    ? 'cursor-pointer hover:shadow-lg active:scale-[0.98] transition-transform'
                    : 'opacity-50'
                }`}
                onClick={() => isUnlocked && navigate(`/level/${level.id}`)}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {isUnlocked ? (
                      <MapPin className="w-5 h-5 text-primary" />
                    ) : (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">
                      第 {idx + 1} 站
                    </div>
                    <h2 className="text-base font-medium text-foreground truncate">
                      {level.name}
                    </h2>
                    {level.map_intro && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {level.map_intro}
                      </p>
                    )}
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 ${getStatusColor(status)}`}>
                      {getStatusLabel(status)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showMedalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowMedalModal(false)}
        >
          <div
            className="relative mx-4 max-w-xs w-full rounded-2xl p-10 flex flex-col items-center gap-5 text-center"
            style={{ backgroundColor: '#f5e6c8', border: '1.5px solid #c4a35a' }}
            onClick={e => e.stopPropagation()}
          >
            <span className="absolute top-3 left-4 text-xs opacity-40" style={{ color: '#a07828' }}>✦</span>
            <span className="absolute bottom-3 right-4 text-xs opacity-40" style={{ color: '#a07828' }}>✦</span>
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(139,90,20,0.12)', border: '1.5px solid #c4a35a' }}>
              <Sparkles className="w-9 h-9" style={{ color: '#8B5E14' }} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#8B5E14' }}>
                {t('medal_subtitle', '全部完成')}
              </p>
              <h2 className="text-xl font-medium mb-2" style={{ color: '#3d2b0e' }}>
                {t('medal_title', '航线已走完')}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: '#6b4c1e' }}>
                {t('medal_body', '你做到了。')}
              </p>
            </div>
            <div className="w-full pt-4 flex justify-center gap-6" style={{ borderTop: '1px solid rgba(139,90,20,0.25)' }}>
              <div className="text-center">
                <p className="text-xl font-medium" style={{ color: '#3d2b0e' }}>{completedCount}</p>
                <p className="text-xs mt-1" style={{ color: '#8B6914' }}>关卡完成</p>
              </div>
              <div style={{ width: 1, background: 'rgba(139,90,20,0.2)' }} />
              <div className="text-center">
                <p className="text-xl font-medium" style={{ color: '#3d2b0e' }}>{noteCount}</p>
                <p className="text-xs mt-1" style={{ color: '#8B6914' }}>探险笔记</p>
              </div>
              <div style={{ width: 1, background: 'rgba(139,90,20,0.2)' }} />
              <div className="text-center">
                <p className="text-xl font-medium" style={{ color: '#3d2b0e' }}>{totalMinutes}</p>
                <p className="text-xs mt-1" style={{ color: '#8B6914' }}>探索分钟</p>
              </div>
            </div>
            <p className="text-xs" style={{ color: '#a08040' }}>点击任意处关闭</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
