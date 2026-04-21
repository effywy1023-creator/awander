import { supabase } from '@/integrations/supabase/client'

export async function getInheritedTags(audioIds: string[]): Promise<string[]> {
  if (!audioIds || audioIds.length === 0) return []

  const { data: assets } = await (supabase as any)
    .from('assets')
    .select('tags')
    .in('id', audioIds)

  const allTags = [...new Set((assets as any[] | null)?.flatMap((a: any) => a.tags ?? []) ?? [])]
  if (allTags.length === 0) return []

  const { data: bodyPartTags } = await (supabase as any)
    .from('tags_asset_level')
    .select('id')
    .eq('category', 'body_part')
    .in('id', allTags)

  return (bodyPartTags as any[] | null)?.map((t: any) => t.id) ?? []
}
