export type TauriHealthResponse = {
  ok: boolean;
  version: string;
  backend: string;
};

export type TauriAppPaths = {
  data_root: string;
  db_dir: string;
  secrets_dir: string;
};

export type TauriCollectionMeta = {
  collection: string;
  file_name: string;
  file_path: string;
  exists: boolean;
  encrypted: boolean;
  doc_count: number;
};
