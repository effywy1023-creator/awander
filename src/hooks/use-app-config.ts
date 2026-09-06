import { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '@/lib/supabase-db';
import { useAuth } from '@/lib/auth';

interface AppConfig {
  [key: string]: string;
}

interface ConfigRow {
  key: string;
  value: string;
  product_id: string | null;
}

const configCache: { data: ConfigRow[] | null; promise: Promise<ConfigRow[]> | null } = {
  data: null,
  promise: null,
};

const fetchConfig = async (): Promise<ConfigRow[]> => {
  const { data } = await db.from('app_config').select('key, value, product_id');
  return (data as ConfigRow[]) || [];
};

export const useAppConfig = () => {
  const currentProductId = useAuth((s) => s.currentProductId);
  const [rows, setRows] = useState<ConfigRow[]>(configCache.data || []);
  const [loading, setLoading] = useState(!configCache.data);

  useEffect(() => {
    if (configCache.data) {
      setRows(configCache.data);
      setLoading(false);
      return;
    }
    if (!configCache.promise) {
      configCache.promise = fetchConfig();
    }
    configCache.promise.then((result) => {
      configCache.data = result;
      setRows(result);
      setLoading(false);
    });
  }, []);

  // 全局配置（product_id 为空）打底，当前产品的专属覆盖值再叠加上去
  const config = useMemo(() => {
    const map: AppConfig = {};
    for (const row of rows) {
      if (row.product_id === null) map[row.key] = row.value;
    }
    if (currentProductId) {
      for (const row of rows) {
        if (row.product_id === currentProductId) map[row.key] = row.value;
      }
    }
    return map;
  }, [rows, currentProductId]);

  const t = useCallback((key: string, fallback: string = '') => config[key] || fallback, [config]);

  return { config, loading, t };
};
