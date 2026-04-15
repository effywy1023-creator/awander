import { useEffect, useState } from 'react';
import { db } from '@/lib/supabase-db';

interface AppConfig {
  [key: string]: string;
}

const configCache: { data: AppConfig | null; promise: Promise<AppConfig> | null } = {
  data: null,
  promise: null,
};

const fetchConfig = async (): Promise<AppConfig> => {
  const { data } = await db.from('app_config').select('key, value');
  const map: AppConfig = {};
  if (data) {
    for (const row of data) {
      map[row.key] = row.value;
    }
  }
  return map;
};

export const useAppConfig = () => {
  const [config, setConfig] = useState<AppConfig>(configCache.data || {});
  const [loading, setLoading] = useState(!configCache.data);

  useEffect(() => {
    if (configCache.data) {
      setConfig(configCache.data);
      setLoading(false);
      return;
    }
    if (!configCache.promise) {
      configCache.promise = fetchConfig();
    }
    configCache.promise.then((result) => {
      configCache.data = result;
      setConfig(result);
      setLoading(false);
    });
  }, []);

  const t = (key: string, fallback: string = '') => config[key] || fallback;

  return { config, loading, t };
};
