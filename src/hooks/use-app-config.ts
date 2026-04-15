import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppConfig {
  [key: string]: string;
}

const configCache: { data: AppConfig | null; promise: Promise<AppConfig> | null } = {
  data: null,
  promise: null,
};

const fetchConfig = async (): Promise<AppConfig> => {
  const { data } = await supabase.from('app_config').select('key, value');
  const map: AppConfig = {};
  if (data) {
    for (const row of data as any[]) {
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
