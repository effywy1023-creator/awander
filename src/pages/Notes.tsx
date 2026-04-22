import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/supabase-db';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

interface NoteWithLevel {
  id: string;
  content: string;
  created_at: string;
  level_id: string;
  level_name: string;
  tags: string[];
}

interface BodyPartTag {
  id: string;
  label_zh: string;
  sort_order: number;
}

interface ModalNote {
  content: string;
  level_id: string;
  created_at: string;
  level_name: string | null;
  product_name: string | null;
}

type GroupMode = 'time' | 'level' | 'body';

const TAB_LABELS: Record<GroupMode, string> = { time: '时间轴', level: '关卡', body: '身体坐标' };

const Notes = () => {
  const { userId, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteWithLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupMode, setGroupMode] = useState<GroupMode>('time');

  const [bodyParts, setBodyParts] = useState<BodyPartTag[]>([]);
  const [bodyPartCount, setBodyPartCount] = useState<Record<string, number>>({});
  const [bodyLoading, setBodyLoading] = useState(false);
  const [selectedPart, setSelectedPart] = useState<BodyPartTag | null>(null);
  const [modalNotes, setModalNotes] = useState<ModalNote[]>([]);
  const [modalLevelsByProduct, setModalLevelsByProduct] = useState<
    Record<string, { productName: string; levels: { id: string; name: string }[] }>
  >({});
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      navigate('/login', { replace: true });
      return;
    }
    loadNotes();
  }, [isLoggedIn, authLoading]);

  useEffect(() => {
    if (groupMode === 'body' && bodyParts.length === 0) {
      loadBodyParts();
    }
  }, [groupMode]);

  const loadNotes = async () => {
    try {
      const { data: notesData } = await db
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
      const { data: levelsData } = await db
        .from('levels')
        .select('id, name')
        .in('id', levelIds);

      const levelNameMap: Record<string, string> = {};
      ((levelsData as any[]) || []).forEach((l) => (levelNameMap[l.id] = l.name));

      const mapped: NoteWithLevel[] = (notesData as any[]).map((n) => ({
        id: n.id,
        content: n.content,
        created_at: n.created_at,
        level_id: n.level_id,
        level_name: levelNameMap[n.level_id] || '未知关卡',
        tags: n.tags ?? [],
      }));

      setNotes(mapped);

      const counts: Record<string, number> = {};
      mapped.forEach((note) => {
        note.tags.forEach((tag) => {
          counts[tag] = (counts[tag] ?? 0) + 1;
        });
      });
      setBodyPartCount(counts);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const loadBodyParts = async () => {
    setBodyLoading(true);
    try {
      const { data } = await db
        .from('tags_asset_level')
        .select('id, label_zh, sort_order')
        .eq('category', 'body_part')
        .order('sort_order', { ascending: true });
      setBodyParts(((data as any[]) || []) as BodyPartTag[]);
    } finally {
      setBodyLoading(false);
    }
  };

  const openModal = async (part: BodyPartTag) => {
    if ((bodyPartCount[part.id] ?? 0) === 0) return;
    setSelectedPart(part);
    setModalLoading(true);

    const { data } = await db
      .from('treasure_notes')
      .select('content, level_id, created_at, levels(name, product_id, products(name))')
      .eq('user_id', userId!)
      .contains('tags', [part.id])
      .order('created_at', { ascending: false });

    const raw = (data as any[]) || [];

    setModalNotes(
      raw.map((n) => ({
        content: n.content,
        level_id: n.level_id,
        created_at: n.created_at,
        level_name: n.levels?.name ?? null,
        product_name: n.levels?.products?.name ?? null,
      }))
    );

    const byProduct: Record<string, { productName: string; levels: { id: string; name: string }[] }> = {};
    raw.forEach((n) => {
      const productName = n.levels?.products?.name ?? '未知产品';
      if (!byProduct[productName]) byProduct[productName] = { productName, levels: [] };
      if (!byProduct[productName].levels.find((l) => l.id === n.level_id)) {
        byProduct[productName].levels.push({ id: n.level_id, name: n.levels?.name ?? n.level_id });
      }
    });
    setModalLevelsByProduct(byProduct);
    setModalLoading(false);
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
        <h1 className="text-lg font-semibold text-foreground">藏宝线索</h1>
      </div>

      <div className="flex rounded-full p-1 bg-card border border-border/50 mb-5 w-fit mx-auto">
        {(['time', 'level', 'body'] as GroupMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setGroupMode(mode)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              groupMode === mode
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {TAB_LABELS[mode]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </div>
      ) : groupMode === 'body' ? (
        bodyLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-pulse text-muted-foreground">加载中...</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {bodyParts.map((part) => {
              const count = bodyPartCount[part.id] ?? 0;
              const explored = count > 0;
              return (
                <button
                  key={part.id}
                  disabled={!explored}
                  onClick={() => openModal(part)}
                  className={`flex items-center gap-3 w-full rounded-xl p-4 text-left transition-all ${
                    explored
                      ? 'bg-card/70 hover:bg-card shadow-sm cursor-pointer'
                      : 'bg-muted/30 cursor-default'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${explored ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  <span className={`flex-1 text-sm font-medium ${explored ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {part.label_zh}
                  </span>
                  <span className={`text-xs ${explored ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                    {count} 条
                  </span>
                  {explored && <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
                </button>
              );
            })}
          </div>
        )
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-20">
          尚未留下任何藏宝线索
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

      <Drawer open={!!selectedPart} onOpenChange={(open) => { if (!open) setSelectedPart(null); }}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="flex items-center justify-between pb-2">
            <DrawerTitle>{selectedPart?.label_zh}</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">关闭</Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-8">
            {modalLoading ? (
              <div className="py-10 text-center text-muted-foreground text-sm animate-pulse">加载中...</div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">探索之旅</h3>
                  {Object.values(modalLevelsByProduct).map(({ productName, levels }) => (
                    <div key={productName} className="mb-3">
                      <p className="text-xs text-muted-foreground mb-2">{productName}</p>
                      <div className="flex flex-col gap-2">
                        {levels.map((level) => (
                          <button
                            key={level.id}
                            onClick={() => { setSelectedPart(null); navigate(`/level/${level.id}`); }}
                            className="flex items-center justify-between w-full rounded-xl bg-accent/10 p-3 text-left hover:bg-accent/20 transition-colors"
                          >
                            <span className="text-sm text-foreground">{level.name}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">藏宝标记点</h3>
                  <div className="flex flex-col gap-2">
                    {modalNotes.map((note, i) => (
                      <div key={i} className="bg-muted/50 rounded-xl p-3">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(note.created_at + 'Z').toLocaleString('zh-CN', { timeZone: 'Asia/Singapore' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Notes;
